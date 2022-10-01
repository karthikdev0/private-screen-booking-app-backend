const User  =  require('../models/user');
const Order  = require('../models/order');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const { validationResult} =  require('express-validator');


function sendMailForPaymentSuccess(data){
    var transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
          user: process.env.EMAIL_USER, //generated by Mailtrap
          pass: process.env.EMAIL_PASSWORD //generated by Mailtrap
        }
      });

      var mailOptions = {
        from: process.env.EMAIL_SENDER,
       /*  to: 'user1@example.com, user2@example.com', */
       to:data.email,
        subject: 'Order and payment is Confirmed',
        text: 'Please ping whatsapp for payment info. our whatsapp number +91 1234567890) ',
        html: `
        <b>Hey ${data.fullName} 
        </b><br> This is your confirmed order details
        <br> Order Id : ${data._id}
        <br>Theatre Name : ${data.theatreName}
        <br>Date : ${data.screenDate}
        <br>PaymentStatus: ${data.paymentStatus}
        <br>Slot Name : ${data.slotName}
        <br>Price : ${data.price}
        <br>Number of seats : ${data.numberOfSeats}

       <hr>
       <p>Show this mail on screenDate when asked</p>
       Thank You
        `
    };

    transport.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
});




}

exports.singup = async (req,res,next) =>{

    try {
        const errors =  validationResult(req);
        if(!errors.isEmpty()){
            const error  =  new Error('Validation failed');
            error.statusCode  = 422;
            error.data  =  errors.array();
            throw error;
        }

        const email  =  req.body.email;
        const username  =  req.body.username;
        const password  =  req.body.password;
        const role  = req.body.role;

        let hashedPassword = await bcrypt.hash(password,12);

        const user  = new User({
            username:username,
            email:email,
            password:hashedPassword,
            role:role
        });
     let result  =  await user.save();
        res.status(201).json({message:'User created',userId : result._id});
    } catch (error) {
        next(error);
    }
};

exports.login  = async ( req,res,next) =>{
    const username  =  req.body.username;
    const password  =  req.body.password;
    let loadedUser;

    try {
        let user = await  User.findOne({username:username})

        if(!user){
            const error  =  new Error('No user found');
            error.statusCode = 401;
            throw error;
        }
        loadedUser = user;
        let isEqual =  bcrypt.compare(password,user.password);

 
        if(!isEqual){
            const error  =  new Error('wrong password');
            error.statusCode = 401;
            throw error;
        }

        const token  =  jwt.sign({
            email:loadedUser.email,
            userId:loadedUser._id.toString(),
            role:loadedUser.role},
        process.env.TOKEN_SECRET_KEY,{expiresIn:'10hr'}
        );

        res.status(200).json({token:token,userId:loadedUser._id.toString()});
    } catch (error) {
        next(error)
    }

  

    
};

 exports.getPendingPaymentStatus = async (req,res,next) =>{
   
    try {
        let user = await  User.findById(req.userId);

        if(!user){
            const error  =  new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        let pendingPaymentsOrder =await Order.find({paymentStatus:false});

        res.status(200).json({pendingPaymentsOrder:pendingPaymentsOrder});
    } catch (error) {
        next(error);
    }
};

 exports.updatePendingPaymentStatus = async (req,res,next) =>{


    try {
        let user  = await User.findById(req.userId);

        if(!user){
            const error  =  new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        const orderId  = req.body.orderId;
        const paymentStatus  = req.body.paymentStatus;

        let foundOrder  =  await Order.findById(orderId);

        foundOrder.paymentStatus = paymentStatus;

        let resultOrder  = await foundOrder.save();

        sendMailForPaymentSuccess(resultOrder);

        res.status(200).json({
            message: "Payment details updated successfully",
            Order :resultOrder
        });



    } catch (error) {
        next(error)
    }

};  