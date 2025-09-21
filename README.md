# Mini Instagram Clone

A lightweight prototype demonstrating video browsing, similarity search, and AI prompt generation. Built with Next.js, TypeScript, Prisma, and SQLite.

## Features

- **Video Feed**: Browse 100+ videos with descriptions and placeholder images
- **Similarity Search**: Find related videos based on descriptions or free-text queries
- **AI Prompt Generation**: Create structured prompts from user interactions
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: SQLite with Prisma ORM
- **Images**: Picsum.photos for placeholder thumbnails

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd insta-clone-rk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup the database**
   ```bash
   # Generate Prisma client
   npx prisma generate
   
   # Create and migrate database
   npx prisma db push
   
   # Seed the database with sample data
   npx tsx scripts/seed.ts
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Database UI: [http://localhost:5555](http://localhost:5555) (Prisma Studio)

## Database

### Overview

The application uses SQLite with Prisma ORM for data persistence. The database contains:

- **100 Videos** with diverse descriptions across 5 categories
- **1 Demo User** for testing interactions
- **Interaction tracking** for likes and "more like this" actions
- **Custom inputs** for AI prompt generation

### Database Location

- **File Path**: `prisma/dev.db`
- **Schema**: `prisma/schema.prisma`

### Data Model

```prisma
model User {
  id           String        @id @default(cuid())
  name         String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  interactions Interaction[]
  customInputs CustomInput[]
}

model Video {
  id          String        @id @default(cuid())
  title       String
  description String
  url         String?       // Optional video URL
  thumbnail   String        // Placeholder image URL
  embedding   String?       // JSON string of embedding vector
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  interactions Interaction[]
}

model Interaction {
  id          String   @id @default(cuid())
  userId      String
  videoId     String
  type        String   // "LIKE" | "MORE_LIKE_THIS"
  note        String?  // For edited query text
  createdAt   DateTime @default(now())
  
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)
  
  @@unique([userId, videoId, type])
}

model CustomInput {
  id        String   @id @default(cuid())
  userId    String
  text      String
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Viewing the Database

#### 1. Prisma Studio (Recommended)

The easiest way to browse your data with a beautiful web interface:

```bash
npx prisma studio
```

Then open [http://localhost:5555](http://localhost:5555) in your browser.

**Features:**
- Browse all tables (User, Video, Interaction, CustomInput)
- View, edit, and add records
- See relationships between tables
- Search and filter data
- Real-time updates

#### 2. Command Line Queries

Query the database directly using SQLite:

```bash
# Check total number of videos
sqlite3 prisma/dev.db "SELECT COUNT(*) as total_videos FROM Video;"

# View sample videos
sqlite3 prisma/dev.db "SELECT title, description FROM Video LIMIT 5;"

# Check database schema
sqlite3 prisma/dev.db ".schema"

# Interactive SQLite shell
sqlite3 prisma/dev.db
```

#### 3. Database Management Commands

```bash
# Reset database (delete all data)
npx prisma db push --force-reset

# Reseed database
npx tsx scripts/seed.ts

# View database status
npx prisma db status

# Generate Prisma client after schema changes
npx prisma generate
```

### Sample Data

The database is seeded with 100 videos across 5 categories:

- **Nature & Landscapes** (20 videos): "Sunset over mountain peaks", "Ocean waves crashing"
- **Urban & City Life** (20 videos): "Busy city street at night", "Modern architecture"
- **Lifestyle & Daily Activities** (20 videos): "Morning coffee preparation", "Yoga session"
- **Travel & Adventure** (20 videos): "Ancient temple ruins", "Tropical beach"
- **Abstract & Creative** (20 videos): "Colorful paint mixing", "Geometric patterns"

Each video includes:
- Unique title and description
- Placeholder image from picsum.photos
- Timestamps for creation and updates
- Ready for embedding vectors (for similarity search)

## API Endpoints

- `GET /api/videos` - Fetch videos with pagination
- `POST /api/videos/:id/like` - Like a video
- `POST /api/videos/:id/more-like-this` - Mark "more like this"
- `POST /api/embed` - Generate embeddings
- `GET /api/similar` - Find similar videos
- `POST /api/prompt` - Generate AI prompts

## Development

### Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── lib/
│   └── prisma.ts      # Prisma client
prisma/
├── dev.db            # SQLite database
└── schema.prisma     # Database schema
scripts/
└── seed.ts           # Database seeding script
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="file:./dev.db"
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
