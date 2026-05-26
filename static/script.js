const socket = io({
    auth: {
        cookie: document.cookie
    }
});
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

form.addEventListener("submit", function(e) {
    e.preventDefault()
    if (input.value) {
        socket.emit("new_message", input.value);
        input.value = "";
    }
})

socket.on("all_messages", function(msgArray){
    msgArray.forEach(msg => {
        var item = document.createElement("li")
        item.textContent = msg.login + ":"+ msg.content
        messages.appendChild(item)
    });

    window.scrollTo(0, document.body.scrollHeight)
})

socket.on("message", function(msg){
    var item = document.createElement("li")
    item.textContent = msg
    messages.appendChild(item)
    window.scrollTo(0, document.body.scrollHeight)
})