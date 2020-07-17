var express=require('express')
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();
var app=express()

app.set('view engine', 'ejs');
app.set('views', './views');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());
app.use(express.static('public'));

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/shopdb', { useNewUrlParser: true , useUnifiedTopology: true }, function (err) {
    if (err) {
        console.log('Not connected to the database: ' + err);
    } else {
        console.log('Successfully connected to MongoDB')
    }
});
var stockSchema = mongoose.Schema({
    brand: String,
    pieces: Number,
    buying_price:Number,
    retail_price: Number,
    wholesale_price: Number
});
var salesSchema = mongoose.Schema({
    date: Date,
    product:{
        brand:String,
        price:Number,
        piece:Number,
        profit:Number
    }
});
var cashSchema = mongoose.Schema({
    date: Date,
    money:Number
});
var Sales = mongoose.model("Sales", salesSchema);
var Stock = mongoose.model("Stock", stockSchema);
var Cash = mongoose.model("Cash", cashSchema);

app.get('/stock', function (req, res) {
    res.render('stock');
});
app.post('/stock', function (req, res) {
    var stockInfo = req.body; //Get the parsed information
    Stock.find({brand:stockInfo.user_brand},(err,data)=>{
        var arrlength=data.length;
        console.log(arrlength)
        if (!stockInfo.user_brand || !stockInfo.user_pieces || arrlength>0) {
            res.render('error');
        }
        else {
            var newStock = new Stock({
                brand: stockInfo.user_brand,
                pieces: stockInfo.user_pieces,
                buying_price: stockInfo.buying_price,
                retail_price: stockInfo.retail_price,
                wholesale_price: stockInfo.wholesale_price
           
            });

            newStock.save(function (err, Stock) {
                if (err) {
                    res.render('error')
                } else {
                    res.render('goodstock')
                }
            });
        }
    })
    
    
    
     
});
app.get('/sales',(req,res)=>{
    res.render('sales')
})

app.post('/sell', function (req, res) {
    var salesInfo = req.body; //Get the parsed information
    var brandsell=salesInfo.brand
    var brand_pieces=parseInt(salesInfo.pieces)
    if (!salesInfo.brand || !salesInfo.pieces ) {
        res.render('error');
    }else {
        Stock.find({brand:salesInfo.brand},(err,response)=>{
            var old_stock = parseInt(response[0].pieces)
            var b_p = parseInt(response[0].buying_price)
            var s_p = parseInt(response[0].retail_price)
            var item_profit=s_p-b_p
            if(old_stock<=0){
                res.render('saleserror')
            }else{
                var new_stock = old_stock - brand_pieces;
                Stock.update({ brand: salesInfo.brand }, { pieces: new_stock }, (thiserr, thisres) => {
                    var newSales = new Sales({
                        date: new Date().toISOString().substr(0, 10),
                        product: {
                            brand: salesInfo.brand,
                            price: parseInt(response[0].retail_price),
                            piece: salesInfo.pieces,
                            profit: item_profit
                        }
                    });

                    newSales.save(function (err, Sales) {
                        if (err) {
                            res.render('error')
                        } else {
                            res.render('goodsale')
                        }
                    });
                    Cash.find((casherr,cashresponse)=>{
                        console.log(cashresponse[0].money)
                        var newmoney = parseInt(cashresponse[0].money) + parseInt(response[0].retail_price) * parseInt(salesInfo.pieces)
                        Cash.update({ money: cashresponse[0].money},{money:newmoney},(updatereq,updateres)=>{

                        });
                    })
                })
            }
            
        })
        
    }
});
app.get('/updatestock',(req,res)=>{
    
    res.render("updatestock")
})
app.post('/update',(req,res)=>{
    var updateInfo = req.body
    var brandValue=updateInfo.brand
    var pieces_input = parseInt(updateInfo.pieces)
    Stock.find({ brand: brandValue }, (err, response) => {
        console.log(response[0].pieces)
        var pieces_old = parseInt(response[0].pieces)
        var new_total_pieces=pieces_input+pieces_old
        
        var cost = parseInt(response[0].buying_price)
        var total_cost = parseInt(response[0].buying_price) * pieces_input
        Cash.find((c_err,c_res)=>{
            var current_money=parseInt(c_res[0].money)
            if (current_money<total_cost){
                res.render('error')
            }else{
                var new_money = current_money - total_cost
                Cash.update({ money: c_res[0].money }, { money: new_money }, (ca_err, ca_res) => {
                    Stock.update({ brand: brandValue }, { pieces: new_total_pieces }, (thiserr, thisres) => {
                        res.render('goodupdate')
                    })
                })
            }
            
        })
        
    
    });
})
app.get('/readstock',(req,res)=>{
    Stock.find((err,response)=>{
        res.render('readstock',{data:response})
    });
    
})
app.get('/getsales',(req,res)=>{
    res.render('getsales')
})
app.post('/retrievesales',(req,res)=>{
    var searchDates=req.body
    var f_date = searchDates.f_date
    var l_date = searchDates.l_date
    Sales.find({ $and: [{ date: { $gte: f_date } }, { date: { $lte: l_date } }]},(err,response)=>{
        
        var totals=[]
        var add=[]
        var profit_arr=[]
        var responsearr=[]
        
            for (var j = 0; j < response.length; j++) {
                totals.push(response[j].product.piece * response[j].product.price)  
                profit_arr.push(response[j].product.profit * response[j].product.piece)
            }
            

        var totals_paid = totals.reduce((a, b) => a + b, 0)
        var p_totals = profit_arr.reduce((a, b) => a + b, 0)
        res.render('sold_items', { data: response, sales_totals: totals_paid,job_profit:p_totals })




        
    })
})
app.get('/cash',(req,res)=>{
    res.render('cash')
})
app.post('/cash', (req, res) => {
    var cashInfo=req.body

    var newCash = new Cash({
        date: new Date().toISOString().substr(0, 10),
        money:cashInfo.brand

    });

    newCash.save(function (err, Cash) {
        if (err) {
            res.render('error')
        } else {
            res.render('goodsale')
        }
    });
})

app.listen(5050)


