var sys = require('sys')
var http = require('http')
var url = require('url')
var fs = require('fs')
var io = require('socket.io')
var amqp = require('amqp')
var _ = require('underscore')

// WEB
function streamFileWithContentType(fileName, contentType, response){
	fs.readFile(__dirname + fileName, function(error, data){
		response.writeHead(200, { 'Content-Type': contentType })
		response.end(data, 'utf8')
	})
}

var server = http.createServer(function(request, response){
	var path = url.parse(request.url).pathname;
	
	console.log('path: ' + path)
	
	if (path === '/') {
		streamFileWithContentType('/index.html', 'text/html', response)
	} else if (path === '/jquery.js' || path === '/socket.io.js' || path === '/json.js') {
		streamFileWithContentType(path, 'text/javascript', response)
	} else {
		response.writeHead(404)
		response.end('404')
	}

})

server.listen(4567)

// SOCKET.IO
var webClients = []
var socketIOServer = io.listen(server)
socketIOServer.on('connection', function(client){
	webClients.push(client)
})

// RABBITMQ
var rabbitConnection = amqp.createConnection({ host: 'localhost' })
rabbitConnection.addListener('ready', function(){
	sys.puts('Connected to ' + rabbitConnection.serverProperties.product)
	var exchange = rabbitConnection.exchange('space', { type: 'topic' });
	var queue = rabbitConnection.queue('web-queue')
	queue.bind(exchange, '#')
	queue.subscribe(function(m){
		
		sys.puts('--- RAW DATA ---')
		sys.puts(m.data)
		sys.puts('----------------')
		
		var json = JSON.parse(m.data)
		
		_.each(webClients, function(client){
			client.send({ payload: json })
		})
	})
})
