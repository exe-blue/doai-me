
// Laixi_WS_API_DemoDlg.cpp: 实现文件
//
#include "pch.h"
#include "framework.h"
#include "Laixi_WS_API_Demo.h"
#include "Laixi_WS_API_DemoDlg.h"
#include "afxdialogex.h"

#ifdef _DEBUG
#define new DEBUG_NEW
#endif

// 用于应用程序“关于”菜单项的 CAboutDlg 对话框

class CAboutDlg : public CDialogEx
{
public:
	CAboutDlg();

	// 对话框数据
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_ABOUTBOX };
#endif

protected:
	virtual void DoDataExchange(CDataExchange* pDX);    // DDX/DDV 支持

	// 实现
protected:
	DECLARE_MESSAGE_MAP()
};

CAboutDlg::CAboutDlg() : CDialogEx(IDD_ABOUTBOX)
{
}

void CAboutDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CAboutDlg, CDialogEx)
END_MESSAGE_MAP()


// CLaixiWSAPIDemoDlg 对话框



CLaixiWSAPIDemoDlg::CLaixiWSAPIDemoDlg(CWnd* pParent /*=nullptr*/)
	: CDialogEx(IDD_LAIXI_WS_API_DEMO_DIALOG, pParent), m_resolver(m_ioc), m_ws(m_ioc)
{
	m_hIcon = AfxGetApp()->LoadIcon(IDR_MAINFRAME);
	m_connectWS = false;
	p_recv_thread = nullptr;
}

void CLaixiWSAPIDemoDlg::DoDataExchange(CDataExchange* pDX)
{
	CDialogEx::DoDataExchange(pDX);
}

BEGIN_MESSAGE_MAP(CLaixiWSAPIDemoDlg, CDialogEx)
	ON_WM_SYSCOMMAND()
	ON_WM_PAINT()
	ON_WM_QUERYDRAGICON()
	ON_BN_CLICKED(IDC_BUTTON_CONNECT, &CLaixiWSAPIDemoDlg::OnBnClickedButtonConnect)
	ON_BN_CLICKED(IDC_BUTTON_DISCONNECT, &CLaixiWSAPIDemoDlg::OnBnClickedButtonDisconnect)
	ON_BN_CLICKED(IDC_BUTTON_LAUNCH_APP, &CLaixiWSAPIDemoDlg::OnBnClickedButtonLaunchApp)
	ON_BN_CLICKED(IDC_BUTTON_TOAST, &CLaixiWSAPIDemoDlg::OnBnClickedButtonToast)
	ON_BN_CLICKED(IDC_BUTTON_SLIDE_UP, &CLaixiWSAPIDemoDlg::OnBnClickedButtonSlideUp)
END_MESSAGE_MAP()


// CLaixiWSAPIDemoDlg 消息处理程序

BOOL CLaixiWSAPIDemoDlg::OnInitDialog()
{
	CDialogEx::OnInitDialog();

	// 将“关于...”菜单项添加到系统菜单中。

	// IDM_ABOUTBOX 必须在系统命令范围内。
	ASSERT((IDM_ABOUTBOX & 0xFFF0) == IDM_ABOUTBOX);
	ASSERT(IDM_ABOUTBOX < 0xF000);

	CMenu* pSysMenu = GetSystemMenu(FALSE);
	if (pSysMenu != nullptr)
	{
		BOOL bNameValid;
		CString strAboutMenu;
		bNameValid = strAboutMenu.LoadString(IDS_ABOUTBOX);
		ASSERT(bNameValid);
		if (!strAboutMenu.IsEmpty())
		{
			pSysMenu->AppendMenu(MF_SEPARATOR);
			pSysMenu->AppendMenu(MF_STRING, IDM_ABOUTBOX, strAboutMenu);
		}
	}

	// 设置此对话框的图标。  当应用程序主窗口不是对话框时，框架将自动
	//  执行此操作
	SetIcon(m_hIcon, TRUE);			// 设置大图标
	SetIcon(m_hIcon, FALSE);		// 设置小图标

	// TODO: 在此添加额外的初始化代码

	return TRUE;  // 除非将焦点设置到控件，否则返回 TRUE
}

void CLaixiWSAPIDemoDlg::OnSysCommand(UINT nID, LPARAM lParam)
{
	if ((nID & 0xFFF0) == IDM_ABOUTBOX)
	{
		CAboutDlg dlgAbout;
		dlgAbout.DoModal();
	}
	else
	{
		CDialogEx::OnSysCommand(nID, lParam);
	}
}

// 如果向对话框添加最小化按钮，则需要下面的代码
//  来绘制该图标。  对于使用文档/视图模型的 MFC 应用程序，
//  这将由框架自动完成。

void CLaixiWSAPIDemoDlg::OnPaint()
{
	if (IsIconic())
	{
		CPaintDC dc(this); // 用于绘制的设备上下文

		SendMessage(WM_ICONERASEBKGND, reinterpret_cast<WPARAM>(dc.GetSafeHdc()), 0);

		// 使图标在工作区矩形中居中
		int cxIcon = GetSystemMetrics(SM_CXICON);
		int cyIcon = GetSystemMetrics(SM_CYICON);
		CRect rect;
		GetClientRect(&rect);
		int x = (rect.Width() - cxIcon + 1) / 2;
		int y = (rect.Height() - cyIcon + 1) / 2;

		// 绘制图标
		dc.DrawIcon(x, y, m_hIcon);
	}
	else
	{
		CDialogEx::OnPaint();
	}
}

//当用户拖动最小化窗口时系统调用此函数取得光标
//显示。
HCURSOR CLaixiWSAPIDemoDlg::OnQueryDragIcon()
{
	return static_cast<HCURSOR>(m_hIcon);
}

void CLaixiWSAPIDemoDlg::recv_ws_msg()
{
	int a = 0;
}



void CLaixiWSAPIDemoDlg::OnBnClickedButtonConnect()
{
	// TODO: 在此添加控件通知处理程序代码
	if (false == m_connectWS)
	{
		try
		{
			auto const address = net::ip::make_address("127.0.0.1"); //服务器地址
			auto const port = static_cast<unsigned short>(std::atoi("22221"));//服务器端口号
			tcp::endpoint endpoint{ address, port };
			auto const results = m_resolver.resolve(endpoint);
			// 在我们从查找中获得的IP地址上建立连接
			net::connect(m_ws.next_layer(), results.begin(), results.end());
			m_ws.set_option(websocket::stream_base::decorator(
				[](websocket::request_type& req)
				{
					req.set(http::field::user_agent,
					std::string(BOOST_BEAST_VERSION_STRING) +
					" websocket-client-coro");
				}));

			m_ws.handshake("127.0.0.1", "/"); //发送握手消息
			m_connectWS = true;

			//启动接受线程
			//p_recv_thread = new boost::thread(boost::bind(&CLaixiWSAPIDemoDlg::recv_ws_msg));
		}
		catch (std::exception const& e)
		{
			std::cerr << "Error: " << e.what() << std::endl;
			m_connectWS = false;
		}
	}
}


void CLaixiWSAPIDemoDlg::OnBnClickedButtonDisconnect()
{
	// TODO: 在此添加控件通知处理程序代码

	if (true == m_connectWS)
	{
		m_ws.close(websocket::close_code::normal);
	}
}


void CLaixiWSAPIDemoDlg::OnBnClickedButtonLaunchApp()
{
	// TODO: 在此添加控件通知处理程序代码
	if (true == m_connectWS)
	{
		std::string strdata = "{\"action\":\"GetAppInfoByAppName\",\"comm\":\
		{\"deviceIds\":\"all\", \"appName\":\"Laixi\"}}";
		m_ws.write(net::buffer(strdata));
	}
}


void CLaixiWSAPIDemoDlg::OnBnClickedButtonToast()
{
	// TODO: 在此添加控件通知处理程序代码
	if (true == m_connectWS)
	{
		std::string strdata = "{\"action\":\"Toast\",\"comm\":\
    		{\"deviceIds\":\"all\", \"content\":\"toast test\"}}";
		m_ws.write(net::buffer(strdata));
	}
}


void CLaixiWSAPIDemoDlg::OnBnClickedButtonSlideUp()
{
	// TODO: 在此添加控件通知处理程序代码
	if (true == m_connectWS)
	{
		std::string strdata = "{\"action\":\"PointerEvent\",\"comm\":\
		{\"deviceIds\":\"all\", \"mask\":6,\"x\":50, \"y\":50, \"endx\":50,\"endy\":20, \"delta\":2}}";

		m_ws.write(net::buffer(strdata));
	}
}
