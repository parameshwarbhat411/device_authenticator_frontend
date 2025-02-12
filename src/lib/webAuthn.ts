export async function verifyBiometrics(): Promise<boolean> {
  if (!window.PublicKeyCredential) {
    console.error("Web Authentication API is not supported in this browser.");
    throw new Error("Web Authentication API is not supported in this browser.");
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

   
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge, 
        rpId: window.location.hostname, 
        allowCredentials: [], 
        userVerification: "required", 
        timeout: 60000, 
      },
    });

    
    if (credential) {
      console.log("Biometric verification successful.");
      return true;
    } else {
      console.error("Biometric verification failed: No credential created.");
      return false;
    }
  } catch (error) {
    console.error("Biometric verification failed:", error);
    throw new Error("Biometric verification failed. Please try again.");
  }
}