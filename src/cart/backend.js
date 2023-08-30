const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const coupons = require('../coupons/coupons.json')
const app = express();
app.use(bodyParser.json());
console.log(coupons,"===============")
const price=5;
const discount_criteria=15
const db = new sqlite3.Database('./src/database/mystore.db');

db.run(`
  CREATE TABLE IF NOT EXISTS cart (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_name TEXT,
    item_quantity INTEGER,
    item_price INTEGER,
    total_price INTEGER
  ) 
`);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'cart.html'));
});

app.post('/cart/add', (req, res) => {
    const { cartItem, itemQty } = req.body;

    if (!cartItem || !itemQty) {
        return res.status(400).json({ error: 'Missing item_name or item_quantity parameter' });
    }

    db.get('SELECT * FROM cart WHERE LOWER(item_name) = LOWER(?)', [cartItem], (err, existingItem) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add item to cart' });
        }

        console.log("existingItem --> " + existingItem)

        if (existingItem) {
            const updatedQuantity = existingItem.item_quantity + parseInt(itemQty);
            db.run('UPDATE cart SET item_quantity = ? WHERE id = ?', [updatedQuantity, existingItem.id], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to update item quantity in cart' });
                }

                res.json({ message: 'Item quantity updated in cart' });
            });
        } else {
            db.run('INSERT INTO cart (item_name, item_quantity ,item_price, total_price) VALUES (?, ?, ?, ?)', [cartItem, parseInt(itemQty),price,parseInt(itemQty)*price], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Failed to add item to cart' });
                }

                res.json({ message: 'Item added to cart successfully' });
            });
        }
    });
});

app.delete('/cart/remove/:id', (req, res) => {
    const itemId = req.params.id;

    db.get('SELECT * FROM cart WHERE id = ?', [itemId], (err, existingItem) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to remove item from cart' });
        }

        if (!existingItem) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        db.run('DELETE FROM cart WHERE id = ?', [itemId], (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to remove item from cart' });
            }

            res.json({ message: 'Item removed from cart successfully' });
        });
    });
});

app.post('/cart/show', (req, res) => {
    const {token}=req.body;

    db.all('SELECT * FROM cart', (err, rows) => {
        let data={}
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to fetch cart items' });
        }
        console.log(rows)
        let total_price=0;
        rows.forEach(row=>{
            total_price+=row.total_price

        })
        console.log("Total price: ",total_price)
        if(token){

            const couponExist=coupons.find(item=>item.key==token)
            if(couponExist){
                console.log(couponExist)
                total_price-=(total_price*discount_criteria)/100
                console.log("Price after discount:",total_price)
            }
        }
        data["items"]=rows
        data["total_price"]=total_price
        // rows.push({total_price:total_price})


        res.json(data);
    });
});

const port = 3001;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
