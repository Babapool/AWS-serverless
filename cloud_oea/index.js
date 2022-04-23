const express = require('express');
const path = require('path');
const app = express();
var AWS = require('aws-sdk');
const bodyParser = require("body-parser");
AWS.config.update({
  region: "us-east-1",
});  

app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'ejs');
  
  const publicDirectory = path.join(__dirname, './public');
  app.use(express.static(publicDirectory));
  
  app.get('/',(req,res)=>{
      res.render('index');
  })

  app.get('/pollMsg', (req,res)=>{
    res.render('pollMsg');
  })

  app.post('/sendMsg', (req, res) => {
    let fname = req.body.fname;
    let lname = req.body.lname;
    let phone = req.body.mobileno;
    let email=req.body.email;
    let product=req.body.product;
    
    // Create an SQS service object
    var sqs = new AWS.SQS({apiVersion: '2012-11-05'});
    AWS.config.update({
      region: "us-east-1",
    });  
    

    var params = {
       // Remove DelaySeconds parameter and value for FIFO queues
      DelaySeconds: 10,
      MessageAttributes: {
        "firstName": {
          DataType: "String",
          StringValue: fname
        },
        "lastName": {
          DataType: "String",
          StringValue: lname
        },
        "mobile":{
          DataType:"Number",
          StringValue: phone
        },
        "email":{
          DataType:"String",
          StringValue:email
        },
        "preOrderProduct":{
          DataType:"String",
          StringValue:product
        }
      },
      MessageBody: "Product which user wants to pre order",
      // MessageDeduplicationId: "TheWhistler",  // Required for FIFO queues
      // MessageGroupId: "Group1",  // Required for FIFO queues
      QueueUrl: "https://sqs.us-east-1.amazonaws.com/841429995876/preorderproduct"
    };
    
    sqs.sendMessage(params, function(err, data) {
      if (err) {
        console.log("Error", err);
      } else {
        console.log("Success", data.MessageId);
      }
    });
    
});

app.post('/pollMsg',(req,res)=>{

  // Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
var docClient = new AWS.DynamoDB.DocumentClient();
AWS.config.update({
  region: "us-east-1",
});

var queueURL = "https://sqs.us-east-1.amazonaws.com/841429995876/preorderproduct";

var params = {
  AttributeNames: ["SentTimestamp"],
  MaxNumberOfMessages: 10,
  MessageAttributeNames: ["All"],
  QueueUrl: queueURL,
  VisibilityTimeout: 20,
  WaitTimeSeconds: 0,
};

sqs.receiveMessage(params, function (err, data) {
  if (err) {
    console.log("Receive Error", err);
  } else if (data.Messages) 
  {
  
    var fname = data.Messages[0].MessageAttributes.firstName.StringValue;
    var lname=data.Messages[0].MessageAttributes.lastName.StringValue;
    var mobile=data.Messages[0].MessageAttributes.mobile.StringValue;
    var email=data.Messages[0].MessageAttributes.email.StringValue;
    var product=data.Messages[0].MessageAttributes.preOrderProduct.StringValue;
                
    var table = "PreOrder";
    var phone = parseInt(mobile);
    var fname = fname;
    var lname=lname;
    var mail=email;
    var product=product

    var params1 = {
      TableName:table,
      Item:{
          "FirstName":fname,
          "LastName":lname,
          "Mobile":phone,
          "Email":mail,
          "PreOrderProduct":product
      }
  };

    console.log("Adding a new item...");
    docClient.put(params1, function (err, data) {
      if (err) {
        console.error(
          "Unable to add item. Error JSON:",
          JSON.stringify(err, null, 2)
        );
      } else {
        console.log("Added item:", JSON.stringify(data, null, 2));
      }
    });

    var deleteParams = {
      QueueUrl: queueURL,
      ReceiptHandle: data.Messages[0].ReceiptHandle,
    };
    sqs.deleteMessage(deleteParams, function (err, data) {
      if (err) {
        console.log("Delete Error", err);
      } else {
        console.log("Message Deleted", data);
      }
    });
  }
});

})

PORT = 3200
app.listen(PORT, () => console.log(`App listening on port ${PORT}`),);