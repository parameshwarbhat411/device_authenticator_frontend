import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyBiometrics } from "../lib/webAuthn"
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import React from "react";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});


const API_BASE_URL = "http://0.0.0.0:8000";

export default function Auth() {
  const [verificationToken, setVerificationToken] = useState<string | undefined>();

 
  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  
  const verifyMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        console.log("Starting biometric verification...");
        const verified = await verifyBiometrics();
        if (!verified) {
          throw new Error("Biometric verification failed");
        }
        console.log("Biometric verification successful");

        
        const deviceId = window.navigator.userAgent; 
        const res = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, device_id: deviceId }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || "Verification failed");
        }

        const data = await res.json();
        return data.token; 
      } catch (error) {
        console.error("Verification error:", error);
        throw error;
      }
    },
    onSuccess: (token) => {
      setVerificationToken(token); 
      alert("Biometric verification successful!"); 
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`); 
    },
  });

  
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!verificationToken) {
        throw new Error("No verification token found");
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: verificationToken }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.detail || "Submission failed");
        }

        const data = await res.json();
        return data; 
      } catch (error) {
        console.error("Submit error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      alert(`Email verified: ${data.email}`); 
      form.reset(); 
      setVerificationToken(undefined); 
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`); 
    },
  });

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Email Authentication</h1>
        <form
          onSubmit={form.handleSubmit((data) => verifyMutation.mutate(data.email))}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              {...form.register("email")}
              type="email"
              className="w-full p-2 border rounded-md"
              placeholder="Enter your email"
              disabled={!!verificationToken || verifyMutation.isPending}
            />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          {!verificationToken ? (
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Verify with Biometrics"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submitMutation.mutate()}
              className="w-full bg-green-500 text-white p-2 rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center justify-center"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                "Submit Email"
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}