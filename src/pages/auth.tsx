import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { verifyBiometrics } from "../lib/webAuthn";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import React from "react";
import { ClientJS } from "clientjs"; 


const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const API_BASE_URL = "http://0.0.0.0:8000";

export default function Auth() {
  const [showModal, setShowModal] = useState(false); 
  const [modalMessage, setModalMessage] = useState(""); 

  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const client = new ClientJS();

  const checkCacheForToken = (email: string) => {
    const cachedData = localStorage.getItem(email); 
    if (cachedData) {
      const { token, expires_at } = JSON.parse(cachedData);
      const isTokenExpired = new Date(expires_at) < new Date();

      if (!isTokenExpired) {
        setModalMessage("User is already Biometrically Verified");
        setShowModal(true);
        return true; 
      } else {
        localStorage.removeItem(email); 
      }
    }
    return false;
  };

  const verifyMutation = useMutation({
    mutationFn: async (email: string) => {
      try {
        
        const isTokenValid = checkCacheForToken(email);
        if (isTokenValid) {
          return; 
        }

        console.log("Starting biometric verification...");
        const verified = await verifyBiometrics();
        if (!verified) {
          throw new Error("Biometric authentication failed");
        }
        console.log("Biometric verification successful");

        const deviceId = client.getFingerprint().toString();
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
        return { email, ...data }; 
      } catch (error) {
        console.error("Verification error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data) return; 

      const { email, token, expires_at } = data;
      localStorage.setItem(email, JSON.stringify({ token, expires_at })); 
      setModalMessage("Biometric verification successful");
      setShowModal(true);
    },
    onError: (error: Error) => {
      setModalMessage(`Error: ${error.message}`);
      setShowModal(true);
    },
  });

  
  const callProtectedEndpoint = async () => {
    
    const email = form.getValues("email");
    
    const cachedData = localStorage.getItem(email);
    if (!cachedData) {
      setModalMessage("Verify Yourself to Access the Protected Resources!");
      setShowModal(true);
      return;
    }

    
    const { token, expires_at } = JSON.parse(cachedData);
    
    if (new Date(expires_at) < new Date()) {
      setModalMessage("Token is expired. Please re-verify biometrics.");
      setShowModal(true);
      return;
    }

    try {
      const deviceId = client.getFingerprint().toString();
      
      const res = await fetch(
        `${API_BASE_URL}/api/protected?token=${token}&device_id=${encodeURIComponent(deviceId)}`
      );

      if (!res.ok) {
        const errBody = await res.json();
        throw new Error(errBody.detail || "Protected endpoint failed");
      }

      const protectedData = await res.json();
      
      setModalMessage(protectedData.message);
      setShowModal(true);
    } catch (error: any) {
      console.error(error);
      setModalMessage(`Error: ${error.message}`);
      setShowModal(true);
    }
  };

  
  const handleCloseModal = () => {
    setShowModal(false);
    form.reset();
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
  // disabled={!isVerified}
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