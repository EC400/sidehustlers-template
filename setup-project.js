const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Erstelle Sidehustlers Projektstruktur...');

// Projektverzeichnis erstellen
const projectDir = process.argv[2] || 'sidehustlers-platform';
if (!fs.existsSync(projectDir)) {
  fs.mkdirSync(projectDir);
}

process.chdir(projectDir);

// Next.js Projekt erstellen
console.log('📦 Installiere Next.js mit TypeScript und Tailwind...');
execSync('npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*"', { stdio: 'inherit' });

// Zusätzliche Abhängigkeiten installieren
console.log('📦 Installiere zusätzliche Abhängigkeiten...');
execSync('npm install next-auth @prisma/client stripe @stripe/stripe-js', { stdio: 'inherit' });
execSync('npm install -D prisma @types/node', { stdio: 'inherit' });

// Verzeichnisstruktur erstellen
const directories = [
  'src/app/(auth)/login',
  'src/app/(auth)/register',
  'src/app/(marketing)',
  'src/app/account/profile',
  'src/app/account/settings',
  'src/app/dashboard/buyer',
  'src/app/dashboard/seller',
  'src/app/dashboard/admin',
  'src/app/services/[category]',
  'src/app/services/[id]',
  'src/app/services/create',
  'src/app/orders/[id]',
  'src/app/disputes/[id]',
  'src/app/chat/[conversationId]',
  'src/app/api/auth',
  'src/app/api/services',
  'src/app/api/orders',
  'src/app/api/chat',
  'src/app/api/disputes',
  'src/app/api/webhooks',
  'src/app/api/stripe',
  'src/components/ui',
  'src/components/layout',
  'src/components/services',
  'src/components/chat',
  'src/components/review',
  'src/components/payment',
  'src/lib',
  'src/hooks',
  'src/types',
  'src/styles',
  'public/images',
  'public/icons'
];

directories.forEach(dir => {
  const dirPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    // Platzhalterdatei erstellen
    const gitkeepPath = path.join(dirPath, '.gitkeep');
    fs.writeFileSync(gitkeepPath, '');
  }
});

// Wichtige Konfigurationsdateien erstellen
const configFiles = {
  'prisma/schema.prisma': `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Account {
  id                String   @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?  @db.Text
  access_token      String?  @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?  @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  role          String    @default("USER") // USER, SELLER, ADMIN

  // Profile information
  bio           String?
  skills        String[]
  rating        Float     @default(0)
  completedJobs Int       @default(0)

  // Relationships
  services      Service[]
  orders        Order[]
  reviews       Review[]
  chats         Chat[]
  disputes      Dispute[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Service {
  id          String   @id @default(cuid())
  title       String
  description String   @db.Text
  price       Float
  category    String
  tags        String[]
  images      String[]
  deliveryTime Int     // in days

  // Relationships
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders    Order[]
  reviews   Review[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@index([userId])
}

model Order {
  id          String   @id @default(cuid())
  status      String   // PENDING, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED
  amount      Float
  requirements String?  @db.Text
  deliveryDate DateTime?

  // Relationships
  serviceId String
  service   Service @relation(fields: [serviceId], references: [id], onDelete: Cascade)
  buyerId   String
  buyer     User    @relation(fields: [buyerId], references: [id], onDelete: Cascade)
  sellerId  String
  seller    User    @relation(fields: [sellerId], references: [id], onDelete: Cascade)
  reviews   Review[]
  disputes  Dispute[]

  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Review {
  id        String   @id @default(cuid())
  rating    Int      // 1-5
  comment   String   @db.Text
  isSellerReview Boolean // true if review is for seller, false for buyer

  // Relationships
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  reviewerId String
  reviewer  User   @relation(fields: [reviewerId], references: [id], onDelete: Cascade)
  targetId  String
  target    User   @relation(fields: [targetId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}

model Chat {
  id             String   @id @default(cuid())
  message        String   @db.Text
  isRead         Boolean  @default(false)

  // Relationships
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User     @relation(fields: [senderId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
}

model Conversation {
  id          String   @id @default(cuid())
  
  // Relationships
  participantIds String[] // Array of user IDs
  participants User[]   @relation("ConversationParticipants", fields: [participantIds], references: [id])
  chats       Chat[]

  orderId     String?
  order       Order?  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Dispute {
  id          String   @id @default(cuid())
  reason      String   @db.Text
  status      String   // OPEN, IN_REVIEW, RESOLVED
  resolution  String?  @db.Text

  // Relationships
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  raisedById  String
  raisedBy    User   @relation(fields: [raisedById], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
`,

  '.env.local.example': `# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sidehustlers?schema=public"

# NextAuth.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your-stripe-publishable-key"

# Uploadthing (for file uploads)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"
`,

  'src/lib/auth.ts': `import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        });

        if (!user) {
          return null;
        }

        // In a real app, you would verify the password hash
        // const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        // For now, we'll use a simple check
        const isPasswordValid = credentials.password === 'password';

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.sub as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    signUp: '/register'
  }
};
`,

  'src/lib/db.ts': `import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
`,

  'src/lib/stripe.ts': `import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Helper function to create a Stripe checkout session
export const createCheckoutSession = async (
  priceId: string,
  customerId?: string
) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: \`\${process.env.NEXTAUTH_URL}/orders/success?session_id={CHECKOUT_SESSION_ID}\`,
    cancel_url: \`\${process.env.NEXTAUTH_URL}/orders/cancel\`,
    customer: customerId,
  });

  return session;
};
`,

  'src/middleware.ts': `import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ token, req }) => {
      const { pathname } = req.nextUrl;

      // Public routes
      if (pathname.startsWith('/api/auth') || 
          pathname === '/' || 
          pathname.startsWith('/services') ||
          pathname.startsWith('/login') ||
          pathname.startsWith('/register')) {
        return true;
      }

      // Protected routes
      if (!token) return false;

      // Admin routes
      if (pathname.startsWith('/admin') && token.role !== 'ADMIN') {
        return false;
      }

      return true;
    },
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/account/:path*',
    '/orders/:path*',
    '/chat/:path*',
    '/admin/:path*',
    '/api/orders/:path*',
    '/api/chat/:path*',
  ],
};
`
};

// Konfigurationsdateien schreiben
Object.entries(configFiles).forEach(([filePath, content]) => {
  const fullPath = path.join(process.cwd(), filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content);
});

// Package.json anpassen
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Scripts hinzufügen
packageJson.scripts = {
  ...packageJson.scripts,
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "db:generate": "prisma generate",
  "db:push": "prisma db push",
  "db:studio": "prisma studio",
  "postinstall": "prisma generate"
};

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Projektstruktur erfolgreich erstellt!');
console.log('📋 Nächste Schritte:');
console.log('1. Kopiere .env.local.example zu .env.local und fülle die Werte aus');
console.log('2. Führe "npm run db:push" aus, um die Datenbank zu initialisieren');
console.log('3. Starte den Entwicklungsserver mit "npm run dev"');
