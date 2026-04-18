# ITAssetPulse

ITAssetPulse is a comprehensive IT asset management solution designed to help organizations efficiently track, manage, and optimize their IT assets throughout their lifecycle. With ITAssetPulse, businesses can gain real-time visibility into their IT infrastructure, streamline asset tracking processes, and make informed decisions to maximize the value of their IT investments.

## Start application

To start the ITAssetPulse application, follow these steps:

1. Clone the repository:
   ```bash
   git clone
   ```
2. Navigate to the project directory:
   ```bash
   cd ITAssetPulse
   ```
3. build docker compose image
   ```bash
   docker-compose build
   ```
4. Start the application using Docker Compose:
   ```bash
   docker-compose up
   ```
5. Access the application:
   Open your web browser and navigate to `http://localhost:5173` to access the ITAssetPulse application.
6. login credentials:
   - Username: admin
   - Password: secret123
7. Seed the database with demo data:
   ```bash
   docker-compose exec backend npm run seed
   ```
