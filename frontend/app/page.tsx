"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Briefcase, Building2, Users, TrendingUp, Search, FileCheck, Shield, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Briefcase className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              euprava
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push("/login")}>
              Log in
            </Button>
            <Button size="sm" onClick={() => router.push("/register")} className="shadow-lg shadow-primary/25">
              Sign up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-8 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Modern Employment Platform</span>
              </div>
              
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="block">Find Your Dream Job</span>
                <span className="block bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  Or Perfect Candidate
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Connect employers with talented professionals. A unified government platform for seamless employment services and opportunities.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button 
                  size="lg" 
                  onClick={() => router.push("/register")}
                  className="text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => router.push("/login")}
                  className="text-base border-2"
                >
                  Sign in
                </Button>
              </div>

              <div className="flex items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Free to use</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Secure & verified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Government certified</span>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-1">
                    1000+
                  </div>
                  <div className="text-sm text-muted-foreground">Active Jobs</div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-1">
                    500+
                  </div>
                  <div className="text-sm text-muted-foreground">Employers</div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-1">
                    5000+
                  </div>
                  <div className="text-sm text-muted-foreground">Candidates</div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent mb-1">
                    95%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </CardContent>
              </Card>
            </div>

            {/* Features Section */}
            <div className="space-y-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Our Platform?</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Everything you need for modern employment services in one place
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="pt-6">
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:scale-110 transition-transform">
                      <Search className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Smart Job Search</h3>
                    <p className="text-muted-foreground">
                      Advanced search and filtering to find opportunities that match your skills and preferences.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="pt-6">
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:scale-110 transition-transform">
                      <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">For Employers</h3>
                    <p className="text-muted-foreground">
                      Post jobs, manage applications, and find qualified candidates with ease.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="pt-6">
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">For Candidates</h3>
                    <p className="text-muted-foreground">
                      Build your profile, upload CV, and apply to jobs with just a few clicks.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="pt-6">
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Career Growth</h3>
                    <p className="text-muted-foreground">
                      Track applications, schedule interviews, and advance your career journey.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="pt-6">
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:scale-110 transition-transform">
                      <FileCheck className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Easy Applications</h3>
                    <p className="text-muted-foreground">
                      Streamlined application process with instant status updates and notifications.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                  <CardContent className="pt-6">
                    <div className="mb-4 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 w-fit group-hover:scale-110 transition-transform">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Secure & Verified</h3>
                    <p className="text-muted-foreground">
                      Government-certified platform with verified employers and secure data handling.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-20">
              <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
                <CardContent className="pt-12 pb-12 text-center">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                  <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                    Join thousands of professionals and employers already using our platform
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      size="lg" 
                      onClick={() => router.push("/register")}
                      className="text-base shadow-xl shadow-primary/25"
                    >
                      Create Account
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => router.push("/login")}
                      className="text-base border-2"
                    >
                      Sign in
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Briefcase className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-semibold">euprava</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © 2025 euprava - Government Employment Platform. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
