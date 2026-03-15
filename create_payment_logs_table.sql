CREATE TABLE payment_logs ( id SERIAL PRIMARY KEY, center_id INT, order_id VARCHAR(120), payment_id VARCHAR(120), amount INT, status VARCHAR(20), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ); 
