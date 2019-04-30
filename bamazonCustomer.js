var mysql = require('mysql')
var inq = require('inquirer')

var products = [];
var cartChoices = [];

var connection = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "0420",
  database: "bamazon"
});

connection.connect(function(err) {
  if (err) throw err;
  else{console.log("connected")}
});

connection.query({
    sql: 'select * from products;',
    timeout: '4000'
}, function(err,data){
    if(err){console.log(err)}
    for (i=0;i<data.length;i++){
        products.push(`${data[i].product_id} - ${data[i].product_name} (${data[i].price})`)
    }
    emptyCart()
    findProduct()
    return products
})

function findQuantity(id,num){
    connection.query({
        sql: `select * from products where product_id = ${id}`,
        timeout: '4000'
    }, function (err, data) {
        if (err) {
            console.log("Please enter a correct product key and quantity (both must be integers)")
            findProduct()
        }
        if (data[0].stock_quantity >= num) {
            addToCart(data, num)
        }
        else {
            console.log("quantity not in stock")
            inq.prompt({
                name: "newQuantity",
                message: 'please enter a lower quantity'
            }).then(function (newNum) {
                findQuantity(id, newNum)
            })

        }
    })
}

function addToCart(order, quantity){
    inq.prompt({
        type: 'list',
        name: 'addToCart',
        message: 'We have that quantity in stock. Would you like to add it to your cart?',
        choices: ['yes','no (view products)']
    }).then(function(answer){
        if (answer.addToCart === 'yes'){
            shoppingCart(order,quantity)
            viewCart(quantity)
       }
        else{
            findProduct()
        }
    })
}

function viewCart(){
    inq.prompt({
        type: 'list',
        name: 'viewCart',
        message: 'Would you like to view your cart?',
        choices: ['yes','no, view products']
    }).then(function(answer){
        if (answer.viewCart === 'yes'){
            sql = 'select * from cart'
            
            connection.query(sql,(error, results, fields) => {
                if (error){
                return console.error(error.message);
                }
                var total = 0;
              
                for (i=0; i<results.length;i++){
                    cartChoices.push(`${results[i].product_id}- ${results[i].product_name} (Qty: ${results[i].quantity})`)
                    console.log('=========================================================')
                    console.log(`Item ${[i]}: ${results[i].product_name}, Price: ${results[i].price}, Qty: ${results[i].quantity}`)
                    let price =results[i].price
                    let quantity =results[i].quantity
                   total += price*quantity;
                }
                console.log(`Total:${total}`)
                checkout()
            });
        }
        else{
            findProduct()
        }
    })
}

function checkout(){
    inq.prompt({
        type: 'list',
        name: 'checkout',
        message: 'Would you like to checkout?',
        choices: ['yes','no, view products', 'edit cart']
    }).then(function(answer){
        if (answer.checkout === 'yes'){
            emptyCart()
            connection.end()
        }
        else if (answer.checkout === 'no, view products'){
            findProduct()
        }
        else if (answer.checkout === 'edit cart'){
            editCart()
        }
    })
}

function editCart(){
   inq.prompt({
       type: 'list',
       name: 'deleteItem',
       message: 'What item would you like to remove?',
       choices: cartChoices
   }).then(function(answer){
       var remove = parseInt(answer.deleteItem.split("-")[0])
       var sql = `DELETE FROM cart WHERE product_id = ${remove};`
      connection.query(sql, (err, results) => {
        if(err){console.log(err)}

        console.log('Rows affected:', results.affectedRows);
      })
      viewCart()
   }) 
}

function emptyCart(){
    var sql = 'DELETE FROM cart WHERE product_id<11'
    connection.query(sql, (err, results) => {
        if(err){console.log(err)}
//        console.log('Rows affected:', results.affectedRows);
    })
//    connection.end()
}
function findProduct(){
    console.log(products)    
    inq.prompt([
    {
        name: 'askProduct',
        message:'What product ID are you looking for?',
    },
    {
        name: 'quantity',
        message: 'How many of this item?'
    }
    ]).then(function(answer){
        for (i = 0; i<products.length;i++){
            if (products[i].startsWith(answer.askProduct)){
              console.log(products[i])
            }
        }
        findQuantity(parseInt(answer.askProduct), answer.quantity)
   })
}

function shoppingCart(item, orderQuantity){
    
    connection.query(({
        
        sql: 
        `INSERT INTO cart  VALUES (${item[0].product_id}, ${item[0].price}, ${orderQuantity}, "${item[0].product_name}");`}), 
        function(err, result){
            if(err){console.log(err)}
        }) 
    updateDB(item[0].product_id, orderQuantity)
}

function updateDB(product, quantity){

    let sql = `UPDATE products SET stock_quantity=(stock_quantity - ${quantity}) WHERE product_id = ${product}`
    let data = [product, quantity];
    
    connection.query(sql, data, (error, results, fields) => {
    if (error){
        return console.error(error.message);
    }
     console.log('Rows affected:', results.affectedRows);
   });
}