export async function verifyBiometrics(): Promise<boolean> {
    if (!window.PublicKeyCredential) {
      console.error("Web Authentication API is not supported in this browser.");
      throw new Error("Web Authentication API is not supported in this browser.");
    }
  
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
  
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge, 
          rp: {
            name: "Email Auth App", 
            id: window.location.hostname, 
          },
          user: {
            id: new Uint8Array(16), 
            name: "localuser",
            displayName: "Local User", 
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 }, 
            { type: "public-key", alg: -257 }, 
          ],
          timeout: 60000, 
          authenticatorSelection: {
            authenticatorAttachment: "platform", 
            userVerification: "required", 
          },
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