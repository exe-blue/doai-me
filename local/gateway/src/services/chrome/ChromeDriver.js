/**
 * Chrome Driver - High-Level Chrome Automation API
 *
 * Puppeteer 위에 구축된 고수준 자동화 API
 *
 * 주요 기능:
 * 1. 페이지 네비게이션 및 조작
 * 2. 요소 찾기 및 상호작용
 * 3. 스크린샷 및 PDF 생성
 * 4. 네트워크 인터셉션
 * 5. 쿠키/로컬스토리지 관리
 *
 * @author Axon (Tech Lead)
 * @version 1.0.0
 */

const EventEmitter = require('events');

/**
 * 대기 옵션
 * @typedef {Object} WaitOptions
 * @property {number} timeout - 타임아웃 (ms)
 * @property {boolean} visible - 보이는 요소만 대기
 */

/**
 * 클릭 옵션
 * @typedef {Object} ClickOptions
 * @property {number} delay - 클릭 전 지연 (ms)
 * @property {number} clickCount - 클릭 횟수
 * @property {string} button - 마우스 버튼 (left, right, middle)
 */

class ChromeDriver extends EventEmitter {
    /**
     * @param {Object} options
     * @param {import('./ConnectionManager')} options.connectionManager
     * @param {Object} options.logger
     * @param {Object} options.humanSimulator - 인간 행동 시뮬레이터 (선택)
     */
    constructor(options = {}) {
        super();

        this.connectionManager = options.connectionManager;
        this.logger = options.logger || console;
        this.humanSimulator = options.humanSimulator || null;

        // 기본 설정
        this.defaultTimeout = options.defaultTimeout || 30000;
        this.defaultNavigationTimeout = options.defaultNavigationTimeout || 60000;
    }

    /**
     * 디바이스의 Chrome에서 페이지 열기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<import('puppeteer-core').Page>}
     */
    async getPage(serial) {
        return this.connectionManager.newPage(serial);
    }

    /**
     * URL로 이동
     * @param {string} serial - 디바이스 시리얼
     * @param {string} url - 대상 URL
     * @param {Object} [options] - 네비게이션 옵션
     * @returns {Promise<void>}
     */
    async navigate(serial, url, options = {}) {
        const page = await this.getPage(serial);

        this.logger.info('[ChromeDriver] Navigating', { serial, url });

        await page.goto(url, {
            waitUntil: options.waitUntil || 'domcontentloaded',
            timeout: options.timeout || this.defaultNavigationTimeout
        });

        this.emit('navigate', { serial, url });
    }

    /**
     * 요소 대기 및 반환
     * @param {string} serial - 디바이스 시리얼
     * @param {string} selector - CSS 선택자
     * @param {WaitOptions} [options]
     * @returns {Promise<import('puppeteer-core').ElementHandle>}
     */
    async waitForSelector(serial, selector, options = {}) {
        const page = await this.getPage(serial);

        return page.waitForSelector(selector, {
            visible: options.visible ?? true,
            timeout: options.timeout || this.defaultTimeout
        });
    }

    /**
     * 요소 클릭
     * @param {string} serial - 디바이스 시리얼
     * @param {string} selector - CSS 선택자
     * @param {ClickOptions} [options]
     * @returns {Promise<void>}
     */
    async click(serial, selector, options = {}) {
        const page = await this.getPage(serial);

        // 요소 대기
        await page.waitForSelector(selector, {
            visible: true,
            timeout: options.timeout || this.defaultTimeout
        });

        // 인간 행동 시뮬레이션 (지연)
        if (this.humanSimulator) {
            const delay = this.humanSimulator.getClickDelay();
            await this._sleep(delay);
        } else if (options.delay) {
            await this._sleep(options.delay);
        }

        await page.click(selector, {
            clickCount: options.clickCount || 1,
            button: options.button || 'left'
        });

        this.logger.debug('[ChromeDriver] Clicked', { serial, selector });
        this.emit('click', { serial, selector });
    }

    /**
     * 텍스트 입력
     * @param {string} serial - 디바이스 시리얼
     * @param {string} selector - CSS 선택자
     * @param {string} text - 입력할 텍스트
     * @param {Object} [options]
     * @returns {Promise<void>}
     */
    async type(serial, selector, text, options = {}) {
        const page = await this.getPage(serial);

        await page.waitForSelector(selector, {
            visible: true,
            timeout: options.timeout || this.defaultTimeout
        });

        // 기존 내용 지우기 (선택)
        if (options.clear) {
            await page.click(selector, { clickCount: 3 });
            await page.keyboard.press('Backspace');
        }

        // 인간처럼 타이핑 (딜레이)
        const typeDelay = this.humanSimulator?.getTypeDelay() || options.delay || 50;

        await page.type(selector, text, { delay: typeDelay });

        this.logger.debug('[ChromeDriver] Typed', { serial, selector, textLength: text.length });
        this.emit('type', { serial, selector, text });
    }

    /**
     * 키보드 입력
     * @param {string} serial - 디바이스 시리얼
     * @param {string} key - 키 이름 (Enter, Tab, etc.)
     * @returns {Promise<void>}
     */
    async pressKey(serial, key) {
        const page = await this.getPage(serial);
        await page.keyboard.press(key);
    }

    /**
     * 스크롤
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} options
     * @param {number} options.x - 가로 스크롤
     * @param {number} options.y - 세로 스크롤
     * @param {string} options.selector - 특정 요소 내 스크롤
     * @returns {Promise<void>}
     */
    async scroll(serial, options = {}) {
        const page = await this.getPage(serial);

        const { x = 0, y = 300, selector } = options;

        if (selector) {
            await page.$eval(selector, (el, scrollY) => {
                el.scrollBy(0, scrollY);
            }, y);
        } else {
            await page.evaluate((scrollX, scrollY) => {
                window.scrollBy(scrollX, scrollY);
            }, x, y);
        }

        this.logger.debug('[ChromeDriver] Scrolled', { serial, x, y });
    }

    /**
     * 스크린샷
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} [options]
     * @returns {Promise<Buffer>}
     */
    async screenshot(serial, options = {}) {
        const page = await this.getPage(serial);

        const screenshot = await page.screenshot({
            type: options.type || 'png',
            fullPage: options.fullPage || false,
            quality: options.quality,
            encoding: options.encoding || 'binary'
        });

        this.logger.debug('[ChromeDriver] Screenshot taken', { serial });
        return screenshot;
    }

    /**
     * 페이지 내용 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<string>}
     */
    async getContent(serial) {
        const page = await this.getPage(serial);
        return page.content();
    }

    /**
     * 현재 URL 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<string>}
     */
    async getCurrentUrl(serial) {
        const page = await this.getPage(serial);
        return page.url();
    }

    /**
     * 페이지 타이틀 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<string>}
     */
    async getTitle(serial) {
        const page = await this.getPage(serial);
        return page.title();
    }

    /**
     * 요소 텍스트 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @param {string} selector - CSS 선택자
     * @returns {Promise<string>}
     */
    async getText(serial, selector) {
        const page = await this.getPage(serial);

        const element = await page.waitForSelector(selector, {
            timeout: this.defaultTimeout
        });

        return page.evaluate(el => el.textContent, element);
    }

    /**
     * 요소 속성 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @param {string} selector - CSS 선택자
     * @param {string} attribute - 속성명
     * @returns {Promise<string|null>}
     */
    async getAttribute(serial, selector, attribute) {
        const page = await this.getPage(serial);

        const element = await page.waitForSelector(selector, {
            timeout: this.defaultTimeout
        });

        return page.evaluate((el, attr) => el.getAttribute(attr), element, attribute);
    }

    /**
     * 요소 존재 여부 확인
     * @param {string} serial - 디바이스 시리얼
     * @param {string} selector - CSS 선택자
     * @returns {Promise<boolean>}
     */
    async exists(serial, selector) {
        const page = await this.getPage(serial);

        try {
            await page.waitForSelector(selector, { timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * JavaScript 실행
     * @param {string} serial - 디바이스 시리얼
     * @param {string} script - JavaScript 코드
     * @param {...any} args - 인자
     * @returns {Promise<any>}
     */
    async evaluate(serial, script, ...args) {
        const page = await this.getPage(serial);
        return page.evaluate(script, ...args);
    }

    /**
     * 쿠키 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<Array>}
     */
    async getCookies(serial) {
        const page = await this.getPage(serial);
        return page.cookies();
    }

    /**
     * 쿠키 설정
     * @param {string} serial - 디바이스 시리얼
     * @param {Array} cookies - 쿠키 배열
     * @returns {Promise<void>}
     */
    async setCookies(serial, cookies) {
        const page = await this.getPage(serial);
        await page.setCookie(...cookies);
    }

    /**
     * 로컬 스토리지 가져오기
     * @param {string} serial - 디바이스 시리얼
     * @param {string} key - 키
     * @returns {Promise<string|null>}
     */
    async getLocalStorage(serial, key) {
        const page = await this.getPage(serial);
        return page.evaluate((k) => localStorage.getItem(k), key);
    }

    /**
     * 로컬 스토리지 설정
     * @param {string} serial - 디바이스 시리얼
     * @param {string} key - 키
     * @param {string} value - 값
     * @returns {Promise<void>}
     */
    async setLocalStorage(serial, key, value) {
        const page = await this.getPage(serial);
        await page.evaluate((k, v) => localStorage.setItem(k, v), key, value);
    }

    /**
     * 네트워크 요청 인터셉션 설정
     * @param {string} serial - 디바이스 시리얼
     * @param {Function} handler - 요청 핸들러
     * @returns {Promise<void>}
     */
    async setRequestInterception(serial, handler) {
        const page = await this.getPage(serial);
        await page.setRequestInterception(true);
        page.on('request', handler);
    }

    /**
     * 응답 대기
     * @param {string} serial - 디바이스 시리얼
     * @param {string|Function} urlOrPredicate - URL 패턴 또는 조건 함수
     * @param {Object} [options]
     * @returns {Promise<import('puppeteer-core').HTTPResponse>}
     */
    async waitForResponse(serial, urlOrPredicate, options = {}) {
        const page = await this.getPage(serial);
        return page.waitForResponse(urlOrPredicate, {
            timeout: options.timeout || this.defaultTimeout
        });
    }

    /**
     * 네비게이션 대기
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} [options]
     * @returns {Promise<void>}
     */
    async waitForNavigation(serial, options = {}) {
        const page = await this.getPage(serial);
        await page.waitForNavigation({
            waitUntil: options.waitUntil || 'domcontentloaded',
            timeout: options.timeout || this.defaultNavigationTimeout
        });
    }

    /**
     * 뒤로 가기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<void>}
     */
    async goBack(serial) {
        const page = await this.getPage(serial);
        await page.goBack();
    }

    /**
     * 앞으로 가기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<void>}
     */
    async goForward(serial) {
        const page = await this.getPage(serial);
        await page.goForward();
    }

    /**
     * 새로고침
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<void>}
     */
    async reload(serial) {
        const page = await this.getPage(serial);
        await page.reload();
    }

    /**
     * 페이지 닫기
     * @param {string} serial - 디바이스 시리얼
     * @returns {Promise<void>}
     */
    async closePage(serial) {
        const page = await this.getPage(serial);
        await page.close();
    }

    /**
     * User Agent 설정
     * @param {string} serial - 디바이스 시리얼
     * @param {string} userAgent
     * @returns {Promise<void>}
     */
    async setUserAgent(serial, userAgent) {
        const page = await this.getPage(serial);
        await page.setUserAgent(userAgent);
    }

    /**
     * 뷰포트 설정
     * @param {string} serial - 디바이스 시리얼
     * @param {Object} viewport - { width, height, deviceScaleFactor, isMobile }
     * @returns {Promise<void>}
     */
    async setViewport(serial, viewport) {
        const page = await this.getPage(serial);
        await page.setViewport(viewport);
    }

    /**
     * Sleep 유틸리티
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ChromeDriver;
