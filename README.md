# M A K V & Associates – Full Stack MERN Website

A modern, responsive full-stack website for **M A K V & Associates**, built with the MERN stack (MongoDB, Express, React, Node.js) and TailwindCSS.

## Features

- 🎨 Modern and aesthetic UI design
- ✨ Smooth animations and hover effects using Framer Motion
- 📱 Fully responsive design
- 🚀 Fast and optimized performance
- 📊 Service management system
- 📧 Contact form with backend integration

## Tech Stack

### Frontend
- React 18 with Vite
- React Router DOM
- TailwindCSS
- Framer Motion (animations)
- Axios (API calls)

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Express Validator
- CORS

## Installation

### Prerequisites
- Node.js (v16 or higher recommended)
- npm
- MongoDB (local or cloud instance)

### Setup Instructions

1. **Clone the repository** and navigate to the project directory

2. **Install root tools (concurrently, nodemon, etc.):**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

4. **Install frontend dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```
   
   The frontend uses **Vite** for fast development and builds.

5. **Set up environment variables (backend):**
   
   Create a `.env` file in the `backend` directory (you can use `env.example` as a reference):
   ```env
   PORT=5004
   MONGODB_URI=mongodb://localhost:27017/ca-website
   NODE_ENV=development
   ```

6. **Start MongoDB:**
   
   Make sure MongoDB is running on your system, or use MongoDB Atlas and update the `MONGODB_URI` accordingly.

## Running the Application

### Option 1: Run both frontend and backend together (recommended)
From the **project root**:
```bash
npm run dev
```
This runs:
- Backend (Express + Mongo) via `nodemon backend/server.js`
- Frontend (Vite) via `npm run dev` in `frontend`

### Option 2: Run separately

**Terminal 1 – Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5004 (default, configured in `server.js` and `vite.config.js`)

## Project Structure

```
ca-website/
├── backend/
│   ├── models/
│   │   └── Contact.js
│   ├── routes/
│   │   ├── contact.js
│   │   └── services.js
│   ├── server.js
│   ├── env.example
│   ├── package.json
│   └── package-lock.json
├── frontend/
│   ├── public/
│   │   ├── images/
│   │   ├── logo/
│   │   ├── serve_logo/
│   │   └── team/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── AboutSection.jsx
│   │   │   ├── ServicesSection.jsx
│   │   │   ├── StatsSection.jsx
│   │   │   ├── ClientsSection.jsx
│   │   │   ├── QuickServicesSection.jsx
│   │   │   └── ServiceCard.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Services.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Partners.jsx
│   │   │   └── Contact.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js
│   ├── tailwind.config.cjs
│   ├── postcss.config.cjs
│   ├── package.json
│   └── package-lock.json
├── package.json        # root scripts (dev, server, client)
├── README.md
└── .gitignore
```

## API Endpoints

### Contact
- `POST /api/contact` - Submit contact form
- `GET /api/contact` - Get all contact submissions (admin)

### Services
- `GET /api/services` - Get all services
- `GET /api/services/:category` - Get services by category


## Features Overview

### Home Page
- Hero section with animated background
- About section
- Services overview
- Statistics section

### Services Page
- Categorized services
- Interactive service cards
- Category filtering

### About Page
- Company story
- Core values
- Team information

### Contact Page
- Contact form with validation
- Contact information
- Form submission to backend

## Customization

### Colors
Edit `frontend/tailwind.config.cjs` to customize the color scheme:
- Primary colors: brand blue shades
- Secondary colors: complementary accent shades

### Content
- Update service information in `backend/routes/services.js`
- Modify company information in respective component files

## Deployment

### Frontend (Vercel/Netlify/Static host)
1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Deploy the contents of the `dist` folder (Vite outputs to `dist`) to your static hosting provider.

### Backend (Render/Railway/VPS/Other Node host)
1. Set environment variables (`PORT`, `MONGODB_URI`, etc.).
2. Deploy the `backend` folder to a Node-compatible host.
3. Ensure the frontend’s API calls point to the correct backend URL in production.

## License

This project is created for **M A K V & Associates**.

## Support

For questions or assistance, please use the **Contact** page on the website or reach out through your usual firm communication channels.

