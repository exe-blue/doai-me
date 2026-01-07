
// Laixi_WS_API_DemoDlg.h: 头文件
//

#pragma once

#include <boost/beast/core.hpp>
#include <boost/beast/websocket.hpp>
#include <boost/asio/connect.hpp>
#include <boost/asio/ip/tcp.hpp>
#include <cstdlib>
#include <iostream>
#include <string>
#include <locale>
#include <codecvt>
#include <wchar.h>
#include <locale.h>
#include <boost/locale.hpp>
#include <boost/thread.hpp>
namespace beast = boost::beast;         // from <boost/beast.hpp>
namespace http = beast::http;           // from <boost/beast/http.hpp>
namespace websocket = beast::websocket; // from <boost/beast/websocket.hpp>
namespace net = boost::asio;            // from <boost/asio.hpp>
using tcp = boost::asio::ip::tcp;       // from <boost/asio/ip/tcp.hpp>

#include <string>
using namespace std;


// CLaixiWSAPIDemoDlg 对话框
class CLaixiWSAPIDemoDlg : public CDialogEx
{
// 构造
public:
	CLaixiWSAPIDemoDlg(CWnd* pParent = nullptr);	// 标准构造函数

// 对话框数据
#ifdef AFX_DESIGN_TIME
	enum { IDD = IDD_LAIXI_WS_API_DEMO_DIALOG };
#endif

	protected:
	virtual void DoDataExchange(CDataExchange* pDX);	// DDX/DDV 支持


// 实现
protected:
	HICON m_hIcon;

	// 生成的消息映射函数
	virtual BOOL OnInitDialog();
	afx_msg void OnSysCommand(UINT nID, LPARAM lParam);
	afx_msg void OnPaint();
	afx_msg HCURSOR OnQueryDragIcon();
	DECLARE_MESSAGE_MAP()
public:
	afx_msg void OnBnClickedButtonConnect();
	afx_msg void OnBnClickedButtonDisconnect();
	afx_msg void OnBnClickedButtonLaunchApp();
	afx_msg void OnBnClickedButtonToast();
	afx_msg void OnBnClickedButtonSlideUp();


private:
	void recv_ws_msg();

private:

	bool m_connectWS;
	net::io_context m_ioc;
	tcp::resolver  m_resolver;
	websocket::stream<tcp::socket> m_ws;

	//接受WS信息对话框
	boost::thread* p_recv_thread;

};
