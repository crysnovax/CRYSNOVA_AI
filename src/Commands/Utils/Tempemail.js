const fetch = require("node-fetch")

module.exports = {
name: "tempemail",
alias: ["tmpmail","tempmail"],
category: "tools",
desc: "Create temp email and receive OTP",

execute: async (sock, m, { args, reply, prefix }) => {

try {

const action = args[0]

if (!global.mailtm) global.mailtm = {}


// CREATE EMAIL
if (!action || action === "create") {

const d = await fetch("https://api.mail.tm/domains")
const domainData = await d.json()

const domain = domainData["hydra:member"][0].domain
const user = Math.random().toString(36).slice(2,10)

const email = `${user}@${domain}`
const password = "pass123456"

await fetch("https://api.mail.tm/accounts",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body: JSON.stringify({address:email,password})
})

const tokenReq = await fetch("https://api.mail.tm/token",{
method:"POST",
headers:{ "Content-Type":"application/json"},
body: JSON.stringify({address:email,password})
})

const tokenData = await tokenReq.json()

global.mailtm[m.sender] = {
email,
token: tokenData.token
}

reply(`📧 TEMP EMAIL

Email:
${email}

Commands
${prefix}tempemail check
${prefix}tempemail read <id>`)

}


// CHECK INBOX
else if (action === "check") {

const data = global.mailtm[m.sender]
if (!data) return reply("Create email first")

const res = await fetch("https://api.mail.tm/messages",{
headers:{ Authorization:`Bearer ${data.token}` }
})

const inbox = await res.json()

if (!inbox["hydra:member"].length)
return reply("📭 Inbox empty")

let msg = "📬 INBOX\n\n"

inbox["hydra:member"].slice(0,5).forEach((mail,i)=>{
msg += `${i+1}. ${mail.subject}\nFrom: ${mail.from.address}\nID: ${mail.id}\n\n`
})

reply(msg)

}


// READ MESSAGE
else if (action === "read") {

const id = args[1]
if (!id) return reply("Provide message id")

const data = global.mailtm[m.sender]
if (!data) return reply("Create email first")

const res = await fetch(`https://api.mail.tm/messages/${id}`,{
headers:{ Authorization:`Bearer ${data.token}` }
})

const mail = await res.json()

reply(`📧 MESSAGE

From: ${mail.from.address}
Subject: ${mail.subject}

${mail.text}`)

}

} catch(e){

console.error(e)
reply("❌ Temp mail error")

}

}
}