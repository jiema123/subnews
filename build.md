我要创建一个web 站点主要功能
1. 界面好看大气派具有现代感
2. 功能主有 管理新闻订阅管理，用户可以创建订阅任务，比如一个新闻网址，一个订阅推送机器人 webhook 地址，订阅机器人平台。我现在先支持钉钉机器人，后期需要支持 企业微信，微信公众号，TG，飞书等平台
3. 用户创建好订阅任务后需要添加 crontab 时间来定义推送频率 
4. 需要设计用户管理，我计划做的简单一个用户只要输入他的邮箱来确认他的账号，密码他自己定义就可以
5. 需要有列表页面来管理他的配置的订阅，需要有功能在配置时进行推送的验证，他可以定义他推送内容的格式模版
6. 需要记录下每次推送的内容，用户可以进行查询

主要内部实现逻辑
1. 使用 r.jina.ai 获取用户输入的订阅 url 如 https://r.jina.ai/https://ai.hubtoday.app/2025-12/2025-12-29/ 有些订阅 url 他是每天更新有新的 url地址如 上面这种，需要通过 ai 进行生成当前日期的 url地址
2. 从 r.jina.ai 获取内容后，需要进行 AI 解读， 我这边的 AI 选用 gemini,  请求接口如 
"curl "https://gemini-api.21588.org/v1beta/openai/chat/completions" \
-H "Content-Type: application/json" \
-H "Authorization: Bearer AIzaSyC75amyasCYEBQOayzlyzhyXQMMlDEvG54" \
-d '{
    "model": "gemini-3-flash-preview",
    "messages": [
    	{"role":"system", "content": "{{系统提示词}}"},
        {"role": "user", "content": "{{输入文本}}"}
    ]
    }'"

3. 获取到 AI 解读后，需要进行内容的解析，集合用户定义的推送模版，进行内容的生成, 再调用用户配置的 webhook 机器人进行推送
4. 以上提到的所有接口都需要包装一层，不能让前端直接抓去到到请求

设计架构
前端使用 html css js typescript
后端使用 nodejs express rest
存储使用 cloudflare kv 
需要支持 本地测试，本地测试数据可以存放在浏览器缓存中
敏感信息 如 kv token, gemini token 需要单独抽离出来，不能放在代码中，需要通过环境变量来配置

上线部署
上线使用 cloudflare pages + cloudflare worker

代码设计完后成，需要输出标准的 README 文档 