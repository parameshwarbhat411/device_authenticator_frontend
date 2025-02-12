import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyBiometrics } from "../lib/webAuthn";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import React from "react";

// Schema for email validation
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const API_BASE_URL = "http://0.0.0.0:8000";

export default function Auth() {
  const [verificationToken, setVerificationToken] = useState<string | undefined>();
  const [showModal, setShowModal] = useState(false); // State to control modal visibility
  const [modalMessage, setModalMessage] = useState(""); // State to store modal message
  const [isVerified, setIsVerified] = useState(false); // State to track if the user is verified

  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Function to check cache for email, token, and expiry
  const checkCacheForToken = (email: string) => {
    const cachedData = localStorage.getItem(email); // Use email as the cache key
    if (cachedData) {
      const { token, expires_at } = JSON.parse(cachedData);
      const isTokenExpired = new Date(expires_at) < new Date();

      if (!isTokenExpired) {
        setVerificationToken(token);
        setIsVerified(true);
        setModalMessage("User is already Biometrically Verified");
        setShowModal(true);
        return true; // Token is valid
      } else {
        localStorage.removeItem(email); // Clear expired token
      }
    }
    return false; // Token is expired or does not exist
  };

  const verifyMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        // Check cache first
        const isTokenValid = checkCacheForToken(email);
        if (isTokenValid) {
          return; // Skip biometric verification if token is valid
        }

        console.log("Starting biometric verification...");
        const verified = await verifyBiometrics();
        if (!verified) {
          throw new Error("Biometric authentication failed");
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
        return { email, ...data }; // Return email along with token and expires_at
      } catch (error) {
        console.error("Verification error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data) return; // Skip if token is already valid

      const { email, token, expires_at } = data;
      setVerificationToken(token);
      localStorage.setItem(email, JSON.stringify({ token, expires_at })); // Cache token with email as key
      setIsVerified(true);
      setModalMessage("Biometric verification successful");
      setShowModal(true);
      console.log("isVerified set to true");
    },
    onError: (error: Error) => {
      setModalMessage(`Error: ${error.message}`);
      setShowModal(true);
    },
  });

  // Function to call the protected endpoint
  const callProtectedEndpoint = async () => {
    // 1) Grab the email from your form or from state
    const email = form.getValues("email");
    // 2) Get the cached token/expiry from localStorage
    const cachedData = localStorage.getItem(email);
    if (!cachedData) {
      setModalMessage("No token found. Please verify first!");
      setShowModal(true);
      return;
    }

    // 3) Parse out token and expiry
    const { token, expires_at } = JSON.parse(cachedData);
    // 4) Check if token is expired (basic client-side check)
    if (new Date(expires_at) < new Date()) {
      setModalMessage("Token is expired. Please re-verify biometrics.");
      setShowModal(true);
      return;
    }

    try {
      const deviceId = window.navigator.userAgent;
      // 5) Call the protected endpoint with token + device_id as query params (or use headers)
      const res = await fetch(
        `${API_BASE_URL}/api/protected?token=${token}&device_id=${encodeURIComponent(deviceId)}`
      );

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.detail || "Protected endpoint failed");
      }

      const protectedData = await res.json();
      // 6) Show success message or handle data
      setModalMessage(protectedData.message);
      setShowModal(true);
    } catch (error: any) {
      console.error(error);
      setModalMessage(`Error: ${error.message}`);
      setShowModal(true);
    }
  };

  // Function to handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    // window.location.reload(); // Refresh the page
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-4">
      <div className="w-50 max-w-md bg-white shadow rounded-lg p-4 text-center">
        <h1 className="h3 mb-4">Email Authentication</h1>

        {/* Email input and verify button */}
        <form onSubmit={form.handleSubmit((data) => verifyMutation.mutate(data.email))} className="mb-3">
          <div className="mb-3 text-start">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              {...form.register("email")}
              type="email"
              className={`form-control ${form.formState.errors.email ? "is-invalid" : ""}`}
              id="email"
              placeholder="Enter your email"
              disabled={verifyMutation.isPending}
            />
            {form.formState.errors.email && (
              <div className="invalid-feedback text-start">
                {form.formState.errors.email.message}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="me-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify with Biometrics"
            )}
          </button>
        </form>

        {/* Button to access protected resource */}
        <button
  type="button"
  className="btn mt-3 w-100"
  style={{ backgroundColor: "#28a745", borderColor: "#28a745", color: "#fff" }}
  onClick={callProtectedEndpoint}
  disabled={!isVerified}
>
  Access Protected Resource
</button>

        {/* Bootstrap Modal */}
        <div
          className={`modal fade ${showModal ? "show" : ""}`}
          style={{ display: showModal ? "block" : "none" }}
          tabIndex={-1}
          aria-labelledby="modalLabel"
          aria-hidden={!showModal}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="modalLabel">
                  {modalMessage.includes("Error") ? "Error" : "Success"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">{modalMessage}</div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Backdrop */}
        {showModal && <div className="modal-backdrop fade show"></div>}
      </div>
    </div>
  );
}