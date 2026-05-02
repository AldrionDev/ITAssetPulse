# IT Asset Pulse (Demo project)

## Project overview

IT Asset Pulse is a comprehensive IT Asset Management (ITAM) solution prototype. I developed this project to demonstrate how organizations can efficiently track, manage, and optimize their IT infrastructure throughout the entire asset lifecycle.

The goal of this demo is to showcase a system that provides real-time visibility into IT investments, streamlines tracking processes, and supports data-driven decision-making to maximize ROI

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
6. login credentials can be found in .env file.
7. Seed the database with demo data:
   ```bash
   docker exec -it asset-backend npm run seed
   ```

## Roadmap:

- [✅] Add search bar
- [✅] Dashboard cards
- [✅] Asset history / audit log
- [] Asset detail page - **In progress**
- [] Role-based auth
- [] QR scanner
