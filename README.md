# Magazin E-commerce

This is an E-commerce web application with a full backend powered by Express and Prisma.

## Setup Instructions

1. **Install dependencies:**
   `npm install`

2. **Environment Variables:**
   Create a `.env` file based on `.env.example`.
   Ensure `DATABASE_URL` and `JWT_SECRET` are correctly configured.

3. **Database Migration:**
   Apply database schemas:
   `npx prisma migrate dev`

4. **Seed Database (Optional):**
   Seed the database with initial categories and products:
   `npm run prisma:seed`

5. **Run the App:**
   `npm run dev`

**Note:** The backend entry point is `server-prisma.ts`. The legacy file `server.ts` has been moved to the `archive/` folder.
