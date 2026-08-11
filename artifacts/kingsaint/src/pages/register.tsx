import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  country: z.string().optional(),
  referralCode: z.string().optional(),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", phone: "", country: "", referralCode: "" },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        setToken(data.token);
        toast({
          title: "Membership Approved",
          description: "Welcome to Novacrest Capital.",
        });
        setLocation('/dashboard');
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Application Failed",
          description: error.message || "An error occurred during registration.",
        });
      }
    }
  });

  function onSubmit(values: z.infer<typeof registerSchema>) {
    registerMutation.mutate({ data: values });
  }

  return (
    <div className="flex-1 flex items-center justify-center pt-24 pb-12 px-4 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-card/80 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-sm shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Apply for Membership</h1>
          <p className="text-muted-foreground text-sm">Join the premier digital asset management platform.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="investor@example.com" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs" />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Phone Number <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Country <span className="text-muted-foreground">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="United Kingdom" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-destructive text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Referral Code <span className="text-muted-foreground">(Optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter code if you were invited" className="bg-background/50 border-white/10 text-white rounded-sm" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base rounded-sm bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide mt-4"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? "Processing..." : "Submit Application"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Already a member?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
            Access your vault
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
