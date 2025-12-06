import { useState } from "react";

/**
 * Check if a password has been exposed in data breaches using the HaveIBeenPwned API.
 * Uses k-anonymity model - only sends the first 5 characters of the SHA-1 hash.
 */
export const usePasswordCheck = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkPasswordBreached = async (password: string): Promise<{ breached: boolean; count?: number }> => {
    setIsChecking(true);
    
    try {
      // Create SHA-1 hash of the password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      
      // k-anonymity: only send first 5 characters of hash
      const prefix = hashHex.slice(0, 5);
      const suffix = hashHex.slice(5);
      
      // Query HaveIBeenPwned API
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          "Add-Padding": "true", // Helps prevent response length analysis
        },
      });
      
      if (!response.ok) {
        console.warn("HIBP API unavailable, skipping breach check");
        return { breached: false };
      }
      
      const text = await response.text();
      const hashes = text.split("\n");
      
      // Check if our password suffix is in the results
      for (const line of hashes) {
        const [hashSuffix, count] = line.split(":");
        if (hashSuffix.trim() === suffix) {
          return { breached: true, count: parseInt(count.trim(), 10) };
        }
      }
      
      return { breached: false };
    } catch (error) {
      console.warn("Failed to check password breach status:", error);
      // Don't block registration if API is unavailable
      return { breached: false };
    } finally {
      setIsChecking(false);
    }
  };

  return { checkPasswordBreached, isChecking };
};
