namespace LaixiWSApiDemo
{
    public partial class Form1 : Form
    {
        public Form1()
        {
            InitializeComponent();

        }

        const string connectIp = "127.0.0.1";
        const int connectPort = 22221;
        private async void Form1_Load(object sender, EventArgs e)
        {
            //连接来喜wspi
            try
            {
                await SocketClient.Connect(connectIp, connectPort);
                label1.Visible = false;
                buttoncon.Visible = false;
            }
            catch (Exception ex)
            {
                label2.Visible = false;
                label1.Text = "请先启动来喜"; 
            }
            //获取当前设备数量
            Task.Run(async () =>
            {

                while (true)
                {
                    try
                    {
                        if (SocketClient.clientWebSocket.State == System.Net.WebSockets.WebSocketState.Open)
                        {
                            OpenRequest request = new OpenRequest();
                            request.action = "list";
                            var respon = await SocketClient.SendMessageAsync(request);
                            if (respon.StatusCode == 200)
                            {
                                var devices = JsonHelper.ToObject<List<ApiListItem>>(respon.result);
                                this.Invoke(() =>
                                {
                                    label2.Text = $"当前一共有：{devices.Count}台设备";

                                });

                            }
                        }

                    }
                    catch (Exception ex)
                    {

                    }
                    await Task.Delay(3000);
                }

            });
        }
        private async void button1_Click(object sender, EventArgs e)
        {
            try
            {
                OpenRequest request = new OpenRequest();
                request.action = "Toast";
                request.comm.Add("deviceIds", "all"); //这里的all代表所有手机,也可以指定 连接名,例如 a83dhuias,hudisw7812
                request.comm.Add("content", "这是来喜弹出的一个Toast提示");
                var respon = await SocketClient.SendMessageAsync(request);
                if (respon.StatusCode == 200)
                {
                    MessageBox.Show("发送成功");

                }
                else
                {
                    MessageBox.Show(respon.result);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        private async void button2_Click(object sender, EventArgs e)
        {
            try
            {
                OpenRequest request = new OpenRequest();
                request.action = "ADB";
                request.comm.Add("deviceIds", "all");//这里的all代表所有手机,也可以指定 连接名,例如 a83dhuias,hudisw7812
                request.comm.Add("command", "am start -n youhu.laixijs/.LaixiActivity");
                var respon = await SocketClient.SendMessageAsync(request);
                if (respon.StatusCode == 200)
                {
                    MessageBox.Show("发送成功");
                }
                else
                {
                    MessageBox.Show(respon.result);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }

        }

        private async void button3_Click(object sender, EventArgs e)
        {
            try
            {
                //mask事件类型 0按下 1移动 2松开 3鼠标右键 4滚轮向上 5滚轮向下 6上滑 7下滑 8左滑 9右滑
                // x，y 坐标 传百分比 百分比  endx endy也是   上滑 下滑  左滑 右滑 需要传endx endy 其他事件传0就行 滚轮向上 滚轮向下需要传delta来喜滚动参数 向上-2 向下2 其他不用传
                OpenRequest request = new OpenRequest();
                request.action = "PointerEvent";
                request.comm.Add("deviceIds", "all"); //这里的all代表所有手机,也可以指定 连接名,例如 a83dhuias,hudisw7812
                request.comm.Add("mask", "6");
                request.comm.Add("x", "0.5");
                request.comm.Add("y", "0.5");
                request.comm.Add("endx", "0.5");
                request.comm.Add("endy", "0.4");
                request.comm.Add("delta", "0");
                var respon = await SocketClient.SendMessageAsync(request);
                if (respon.StatusCode == 200)
                {
                    MessageBox.Show("发送成功");
                }
                else
                {
                    MessageBox.Show(respon.result);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message);
            }
        }

        private async void buttoncon_Click(object sender, EventArgs e)
        {
            //连接来喜wspi
            try
            {
                await SocketClient.Connect(connectIp, connectPort);
                label1.Visible = false;
                buttoncon.Visible = false;
            }
            catch (Exception ex)
            {
                label1.Text = $"连接失败：{ex.Message}";
            }
        }
    }
}