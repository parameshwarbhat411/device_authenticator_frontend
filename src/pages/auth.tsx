import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyBiometrics } from "../lib/webAuthn"
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

// Define schema for email validation using zod
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Base URL for the backend API
const API_BASE_URL = "http://0.0.0.0:8000";

export default function Auth() {
  const [verificationToken, setVerificationToken] = useState<string | undefined>();

  // Initialize react-hook-form with zod resolver
  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Mutation for biometric verification and token generation
  const verifyMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        console.log("Starting biometric verification...");
        const verified = await verifyBiometrics();
        if (!verified) {
          throw new Error("Biometric verification failed");
        }
        console.log("Biometric verification successful");

        // Send email and device ID to the backend for verification
        const deviceId = window.navigator.userAgent; // Use user agent as device ID
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
        return data.token; // Return the verification token
      } catch (error) {
        console.error("Verification error:", error);
        throw error;
      }
    },
    onSuccess: (token) => {
      setVerificationToken(token); // Store the token in state
      alert("Biometric verification successful!"); // Prompt for success
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`); // Prompt for error
    },
  });

  // Mutation for submitting the email after verification
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!verificationToken) {
        throw new Error("No verification token found");
      }

      try {
        // Submit the verification token to the backend
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
        return data; // Return the response data
      } catch (error) {
        console.error("Submit error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      alert(`Email verified: ${data.email}`); // Prompt for success
      form.reset(); // Reset the form
      setVerificationToken(undefined); // Clear the verification token
    },
    onError: (error: Error) => {
      alert(`Error: ${error.message}`); // Prompt for error
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