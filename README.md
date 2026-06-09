# Smart Campus Printing System

A modern, production-ready printing management system built with Next.js 14.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- NextAuth Authentication

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Update the `.env` and `.env.local` files with:
   - PostgreSQL password
   - Razorpay API credentials (see SETUP_INSTRUCTIONS.md)

3. Run database migrations:
```bash
npx prisma migrate dev
```

4. Seed the database with sample printers:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Features

- User authentication (login/register)
- Role-based access (Student/Admin)
- Document upload (PDF, DOCX, PPTX)
- Print preferences configuration
- Razorpay payment integration
- Token-based printing system
- Queue management
- Printable token slips
- Real-time cost calculation
- Mobile-friendly responsive design
- Type-safe database queries with Prisma
- Secure password hashing

## Project Structure

```
app/
├── (auth)/
│   ├── login/
│   └── register/
├── dashboard/
├── api/
│   └── auth/
components/
├── ui/
lib/
prisma/
```
