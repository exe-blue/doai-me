using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace LaixiWSApiDemo
{
    public class OpenRequest
    {
        public string action { get; set; }
        public Dictionary<string, string> comm { get; set; } = new Dictionary<string, string>();
    }
    public class OpenResponse
    {
        public int StatusCode { get; set; }
        public string result { get; set; }
    }


    public class ApiListItem
    {
        public string deviceId { get; set; }
        public int no { get; set; }
        public string name { get; set; }
        public bool isOtg { get; set; }
        public bool isCloud { get; set; }
    }

}
