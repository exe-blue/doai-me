using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Threading.Tasks;

namespace LaixiWSApiDemo
{
    public class SocketClient
    {
        public static ClientWebSocket clientWebSocket;
        public static Uri serverUri;
        public async static Task Connect(string ip, int port)
        {
            var webSocketUrl = $@"ws://{ip}:{port}";
            clientWebSocket = new ClientWebSocket();
            serverUri = new Uri(webSocketUrl);
            await  clientWebSocket.ConnectAsync(serverUri, CancellationToken.None) ;
        }

       static  readonly SemaphoreSlim locker = new SemaphoreSlim(1, 1);
        public async static Task<OpenResponse> SendMessageAsync(OpenRequest request)
        {
            await locker.WaitAsync();
            try
            {
                //if (clientWebSocket.State != WebSocketState.Open)
                //{
                //    await clientWebSocket.ConnectAsync(serverUri, CancellationToken.None);
                //}

                ArraySegment<byte> bytesToSend = new ArraySegment<byte>(Encoding.UTF8.GetBytes(JsonHelper.ToJson(request)));
                await clientWebSocket.SendAsync(bytesToSend, WebSocketMessageType.Text, true, CancellationToken.None);

                ArraySegment<byte> bytesReceived = new ArraySegment<byte>(new byte[1024*1024*6]);
                WebSocketReceiveResult result = await clientWebSocket.ReceiveAsync(bytesReceived, CancellationToken.None);
                var respon = Encoding.UTF8.GetString(bytesReceived.Array, 0, result.Count);
                return JsonHelper.ToObject<OpenResponse>(respon);
            }
            finally  
            {
                locker.Release();
            }
           
        }
    }
}
