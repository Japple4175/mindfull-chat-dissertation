'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Brain, Zap } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <Brain className="h-16 w-16 text-primary animate-pulse" />
        <p className="mt-4 text-lg text-foreground">Loading Mindful Chat...</p>
      </div>
    );
  }

  if (user) {
    // This case should ideally not be hit due to the redirect above, but as a fallback.
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
        <Brain className="h-16 w-16 text-primary" />
        <p className="mt-4 text-lg text-foreground">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-primary/10">
      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-2xl font-headline font-bold text-foreground">Mindful Chat</span>
          </Link>
          <nav className="space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 sm:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-headline font-extrabold text-foreground tracking-tight">
              Find Your Calm, <span className="text-primary">One Chat at a Time</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              Mindful Chat helps you understand your moods and offers a supportive space to talk. Start your journey to a more mindful you.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started Free</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">I Already Have an Account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 bg-background/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-headline font-bold text-foreground">Features to Support Your Wellbeing</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                <Image data-ai-hint="journal mood" src="https://placehold.co/600x400.png" alt="Mood Logging" width={600} height={400} className="rounded-md mb-4 aspect-video object-cover" />
                <h3 className="text-xl font-headline font-semibold text-primary mb-2">Mood Logging</h3>
                <p className="text-muted-foreground">Track your daily emotions with a simple, visual interface. Identify patterns and gain insights into your emotional landscape.</p>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                <Image data-ai-hint="chatbot conversation" src="https://placehold.co/600x400.png" alt="AI Chatbot" width={600} height={400} className="rounded-md mb-4 aspect-video object-cover" />
                <h3 className="text-xl font-headline font-semibold text-primary mb-2">AI Chatbot</h3>
                <p className="text-muted-foreground">Engage in supportive conversations with our AI companion. A safe, non-judgmental space to explore your thoughts and feelings.</p>
              </div>
              <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
                <Image data-ai-hint="data privacy" src="https://placehold.co/600x400.png" alt="Data Privacy" width={600} height={400} className="rounded-md mb-4 aspect-video object-cover" />
                <h3 className="text-xl font-headline font-semibold text-primary mb-2">Privacy First</h3>
                <p className="text-muted-foreground">Your data is yours. We prioritize your privacy with secure storage and give you full control over your information.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-background/80 text-center">
        <p className="text-muted-foreground">&copy; {new Date().getFullYear()} Mindful Chat. Nurturing mental wellness together.</p>
      </footer>
    </div>
  );
}
