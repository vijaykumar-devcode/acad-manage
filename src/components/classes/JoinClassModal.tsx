import { useState } from "react";
import api from "../../services/api";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function JoinClassModal({
  isOpen,
  onClose,
  onSuccess,
}: JoinClassModalProps) {
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError("Please enter a join code or link");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const extractedCode = joinCode.includes("/")
        ? joinCode.split("/").pop()?.toUpperCase()
        : joinCode.toUpperCase();
      await api.post("/classes/join", { joinCode: extractedCode });

      setIsLoading(false);
      setJoinCode("");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to join class. Please check the code and try again.");
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join a Class">
      {error && (
        <div className="mb-4 p-3 rounded-md bg-red-50 text-red-600 text-sm border border-red-200">
          {error}
        </div>
      )}
      <form onSubmit={handleJoin} className="space-y-4">
        <p className="text-sm text-slate-500 mb-4">
          Enter the class join code provided by your faculty member to enroll in
          the class.
        </p>

        <Input
          label="Join Code or Link"
          placeholder="e.g. DBMS-X7Y8Z or https://AcadeManage.com/join/..."
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          error={error}
        />

        <div className="pt-4 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Join Class
          </Button>
        </div>
      </form>
    </Modal>
  );
}
