class Wsapi {
  /**
   * @param {Object} options
   * @param {Function|undefined} options.onConnectSuccess - 创建ws成功的事件回调
   * @param {Function|undefined} options.onConnectFail - 创建ws失败的事件回调
   * @param {Function|undefined} options.onConnectClose - ws关闭的事件回调
   */
  constructor(options = {}) {
    // options 유효성 검사 - undefined나 객체가 아닌 경우 빈 객체로 폴백
    const safeOptions = (options && typeof options === 'object') ? options : {};
    const { onConnectSuccess, onConnectFail, onConnectClose } = safeOptions;

    this.CONNECT_IP = '127.0.0.1:22221';

    this.ws = null;
    this.loading = '';
    this.connected = false;

    // 콜백 함수들을 안전하게 초기화 (no-op 폴백)
    this.onConnectSuccess = typeof onConnectSuccess === 'function' 
      ? (deviceList) => onConnectSuccess(deviceList) 
      : () => {};
    this.onConnectFail = typeof onConnectFail === 'function' 
      ? () => onConnectFail() 
      : () => {};
    this.onConnectClose = typeof onConnectClose === 'function' 
      ? () => onConnectClose() 
      : () => {};
  }

  /**
   * @function _wsapiResultFormat 格式化ws返回结果
   * @param {string} resText - ws返回的响应结果文本
   */
  _wsapiResultFormat(resText = '') {
    return resText.replace(/\\r\\n/g, '\n').replace(/\\"/g, '"');
  }

  /**
   * @function 创建wsapi的websocket连接
   */
  async connectWs() {
    if (!window.WebSocket) {
      return alert('抱歉，您的浏览器不支持WebSocket协议！');
    }
    this.loading = '连接中...';
    try {
      const ws = new WebSocket(`ws://${this.CONNECT_IP}/`);

      ws.addEventListener('open', async () => {
        const deviceList = await this.getDeviceListAll();
        this.onConnectSuccess(deviceList);
        this.loading = '';
        this.connected = true;
      });

      ws.addEventListener('close', () => {
        this.onConnectClose();
        if (!this.connected) return;
        this.loading = '';
        this.connected = false;
      });

      ws.addEventListener('error', () => {
        this.onConnectFail();
        this.loading = '';
      });

      this.ws = ws;
    } catch (error) {
      alert(error.message);
    }
  }

  /**
   * @function getDeviceListAll 获取当前所有设备
   * @returns {Array} 设备列表
   */
  getDeviceListAll() {
    return new Promise((resolve) => {
      // WebSocket이 없거나 열려있지 않으면 빈 배열 반환
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return resolve([]);
      }

      const TIMEOUT_MS = 10000; // 10초 타임아웃
      let timeoutId = null;
      let messageHandler = null;

      // 타임아웃 및 리스너 정리 헬퍼
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (messageHandler && this.ws) {
          this.ws.removeEventListener('message', messageHandler);
        }
      };

      // 메시지 핸들러
      messageHandler = (evt) => {
        cleanup();
        try {
          const resData = JSON.parse(evt.data);
          if (resData.StatusCode !== 200) return resolve([]);
          const data = JSON.parse(resData.result || '[]');
          resolve(data);
        } catch (e) {
          console.error('Failed to parse device list:', e);
          resolve([]);
        }
      };

      // 타임아웃 설정
      timeoutId = setTimeout(() => {
        cleanup();
        console.warn('getDeviceListAll timeout');
        resolve([]);
      }, TIMEOUT_MS);

      this.ws.addEventListener('message', messageHandler, { once: true });
      this.ws.send(JSON.stringify({ action: 'list' }));
    });
  }

  /**
   * @function sendWsApi 发送wsapi指令
   * @param {string} wsapiVal - 指令文本
   */
  async sendWsApi(wsapiVal = '') {
    try {
      if (!this.connected) throw new Error('WebSocket未连接，执行指令失败！');
      this.loading = '执行中...';

      const res = [];

      const data = await new Promise(resolve => {
        this.ws.send(wsapiVal);
        this.ws.addEventListener('message', evt => resolve(evt.data), {
          once: true
        });
      });
      const deviceList = await this.getDeviceListAll();

      return [deviceList, this._wsapiResultFormat(data)];
    } catch (error) {
      const message =
        error.message || '发送指令失败，请检查要执行的指令是否填写正确';
      throw new Error(message);
    } finally {
      this.loading = '';
    }
  }

  /**
   * @function toastMsg 发送toast
   * @param {Object} options - 选项
   * @param {string} options.content - toast内容
   * @param {string} options.deviceIds - 设备ID字符串，多个ID之间用,隔开，全部则为all
   */
  async toastMsg(options = {}) {
    if (typeof options !== 'object') {
      throw new Error('sendToast方法传入的参数必须是Object');
    }
    const { content = 'Hi,laixi.app', deviceIds = 'all' } = options;
    // 필수 필드 검증 (null/undefined만 체크, 빈 문자열이나 0은 허용)
    const requiredFields = ['content', 'deviceIds'];
    requiredFields.forEach(k => {
      if (options[k] === undefined || options[k] === null) {
        throw new Error(`请传入正确的${k}`);
      }
    });
    return await this.sendWsApi(
      JSON.stringify({
        action: 'Toast',
        comm: {
          deviceIds,
          content
        }
      })
    );
  }

  /**
   * @function launchApp 通过APP包名打开APP
   * @param {Object} options - 选项
   * @param {string} options.appName - app包名
   * @param {string} options.deviceIds - 设备ID字符串，多个ID之间用,隔开，全部则为all
   */
  async launchApp(options = {}) {
    if (typeof options !== 'object') {
      throw new Error('launchApp方法传入的参数必须是Object');
    }
    const { appName, deviceIds = 'all' } = options;
    // 필수 필드 검증 (null/undefined만 체크)
    const requiredFields = ['appName'];
    requiredFields.forEach(k => {
      if (options[k] === undefined || options[k] === null) {
        throw new Error(`请传入正确的${k}`);
      }
    });
    return await this.sendWsApi(
      JSON.stringify({
        action: 'ADB',
        comm: {
          deviceIds,
          command: `adb shell monkey -p ${appName} -c android.intent.category.LAUNCHER 1`
        }
      })
    );
  }

  /**
   * @function pointEvent 触屏操作
   * @param {Object} options - 选项
   * @param {string} options.deviceIds - 设备ID字符串，多个ID之间用,隔开，全部则为all
   * @param {string|number} options.mask //0按下 1移动 2松开 3鼠标右键 4滚轮向上 5滚轮向下 6上滑 7下滑 8左滑 9右滑
   * @param {string|number} options.x 起始X坐标，百分比
   * @param {string|number} options.y 起始Y坐标，百分比
   * @param {string|number} options.endx 终止X坐标，百分比
   * @param {string|number} options.endy 终止Y坐标，百分比
   * @param {string|number} options.delta 滚动参数 上是-2，下是2，其余为0
   * @returns
   */
  async pointEvent(options = { deviceIds: 'all' }) {
    if (typeof options !== 'object') {
      throw new Error('pointEvent方法传入的参数必须是Object');
    }
    const { deviceIds = 'all', mask, x, y, endx, endy, delta } = options;
    // 필수 필드 검증 (null/undefined만 체크, 0이나 빈 문자열은 허용)
    const requiredFields = ['deviceIds', 'mask'];
    requiredFields.forEach(k => {
      if (options[k] === undefined || options[k] === null) {
        throw new Error(`请传入正确的${k}`);
      }
    });
    return await this.sendWsApi(
      JSON.stringify({
        action: 'PointerEvent',
        comm: {
          deviceIds,
          mask,
          x,
          y,
          endx,
          endy,
          delta
        }
      })
    );
  }

  /**
   * @function listKeywordPackages 列出关键词包名
   * @param {Object} options - 选项
   * @param {string} options.keyword - 关键词
   * @param {string} options.deviceIds - 设备ID字符串，多个ID之间用,隔开，全部则为all
   */
  async listKeywordPackages(options = {}) {
    if (typeof options !== 'object') {
      throw new Error('listKeywordPackages方法传入的参数必须是Object');
    }
    const { keyword, deviceIds = 'all' } = options;
    // 필수 필드 검증 (null/undefined만 체크)
    const requiredFields = ['keyword'];
    requiredFields.forEach(k => {
      if (options[k] === undefined || options[k] === null) {
        throw new Error(`请传入正确的${k}`);
      }
    });
    return await this.sendWsApi(
      JSON.stringify({
        action: 'ADB',
        comm: {
          deviceIds,
          command: `pm list package | grep ${keyword}`
        }
      })
    );
  }
}
