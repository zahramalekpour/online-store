# Online store backend

A scalable e-commerce backend built with Express.js, Sequelize, MariaDB, JWT Authentication, RBAC, and Zarinpal Payment Gateway.

## Features

- JWT Authentication & Authorization
- Role-Based Access Control (RBAC)
- Product Management
- Shopping Basket
- Order Management
- Zarinpal Payment Integration
- Global Error Handling
- Sequelize ORM

## Tech Stack

- Node.js
- Express.js
- Sequelize
- MariaDB / MySQL
- JWT
- Axios

## Installation

```bash
npm install
npm start
```

## Environment Variables

```env
PORT = 2500
DB_HOST = localhost
DB_PORT = 3306
DB_USER = root
DB_PASSWORD = root
DB_NAME = Online store backend

ACCESS_WEB_TOKEN = DWNKJDBNLKDMQWFENWFBVWFJHWB
REFRESH_WEB_TOKEN = DMCHGGFCNSDLKASSPQSKQWDNWL

ZARINPAL_REQUEST_IURL = https://payment.zarinpal.com/pg/v4/payment/request.json
ZARINPAL_VERIFY_URL = ttps://payment.zarinpal.com/pg/v4/payment/verify.json
ZARINPLA_MECHANT_ID=378daeb7-4bbb-4ce7-8ed4-281ca937e016
ZARINPAL_CALLBACK_URL = http://localhost:2500/payment/callback
ZARINPAL_GATEWAY_URL= https://zarinpal.com/pg/StartPay

## API Modules
- Auth
- Product
- Basket
- Order
- Payment
- RBAC

## Project Structure

├── modules
│   ├── auth          # Authentication & JWT
│   ├── product       # Product Management
│   ├── basket        # Shopping Basket
│   ├── order         # Order Processing
│   ├── payment       # Zarinpal Integration
│   └── RBAC          # Role-Based Access Control
│--common
│   ├── order.const.js
│   └── product.constat.js
|
├── config
│   ├── sequelize.config.js
│   └── models.initial.js
│
├── app.js
├── package.json
├── README.md
└── .env

## Author

zahra malekpour