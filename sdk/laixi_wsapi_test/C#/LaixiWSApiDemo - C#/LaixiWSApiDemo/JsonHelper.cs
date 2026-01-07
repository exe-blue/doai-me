
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Data;

namespace LaixiWSApiDemo
{
    public static class JsonHelper
    {

        public static string ToJson(this object obj, params string[] ignoreProperties)
        {
            JsonSerializerSettings settings = new JsonSerializerSettings();
            settings.Formatting = Formatting.Indented;
            settings.DateFormatString = "yyyy-MM-dd HH:mm:ss";
            settings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
            settings.ContractResolver = new JsonPropertyContractResolver(ignoreProperties);
            return JsonConvert.SerializeObject(obj, settings);
        }

        public static T ToObject<T>(this string json)
        {
            return json == null ? default(T) : JsonConvert.DeserializeObject<T>(json);
        }

        public static List<T> ToList<T>(this string json)
        {
            return json == null ? null : JsonConvert.DeserializeObject<List<T>>(json);
        }


    }

    public class JsonPropertyContractResolver : DefaultContractResolver
    {
        private IEnumerable<string> _listExclude;

        public JsonPropertyContractResolver(params string[] ignoreProperties)
        {
            this._listExclude = ignoreProperties;
        }

        protected override IList<JsonProperty> CreateProperties(Type type, MemberSerialization memberSerialization)
        {
            return base.CreateProperties(type, memberSerialization).ToList().FindAll(p => !_listExclude.Contains(p.PropertyName));
        }
    }

}
