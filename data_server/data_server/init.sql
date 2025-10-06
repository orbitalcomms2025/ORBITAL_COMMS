CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'User',
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
--This example is for reference only since 
-- render directly does not take into account sql files
-- the table design was done from Dbeaver