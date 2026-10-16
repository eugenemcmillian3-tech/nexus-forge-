import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { signInMock, optionsMock } = vi.hoisted(() => ({ signInMock: vi.fn(), optionsMock: vi.fn() }));
vi.mock("convex/react",()=>({useQuery:optionsMock}));
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: signInMock }),
}));

import { SignInForm } from "../../src/components/sign-in-form";

describe("operator authentication flow", () => {
  it("offers configured Workspace sign-in and sends only the fixed provider and redirect",async()=>{
    signInMock.mockResolvedValue(undefined);
    optionsMock.mockReturnValue({workspaceSso:true,domain:"example.com"});
    render(<SignInForm/>);
    fireEvent.click(screen.getByRole("button",{name:"Continue with Google Workspace"}));
    await waitFor(()=>expect(signInMock).toHaveBeenCalledWith("google",{redirectTo:"/"}));
  });
  beforeEach(() => {
    signInMock.mockReset();
    optionsMock.mockReturnValue({workspaceSso:false,domain:null});
    signInMock.mockResolvedValue(undefined);
  });

  it("requests an OTP and moves to the verification step", async () => {
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "operator@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(1));
    expect(signInMock).toHaveBeenCalledWith("resend-otp", expect.any(FormData));
    expect((signInMock.mock.calls[0][1] as FormData).get("email")).toBe("operator@example.test");
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument();
    expect(screen.getByLabelText("Verification code")).toBeRequired();
  });

  it("submits the OTP with the same email identity", async () => {
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "operator@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
    await screen.findByRole("heading", { name: "Check your email" });

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify and enter" }));

    await waitFor(() => expect(signInMock).toHaveBeenCalledTimes(2));
    const verificationData = signInMock.mock.calls[1][1] as FormData;
    expect(verificationData.get("email")).toBe("operator@example.test");
    expect(verificationData.get("code")).toBe("123456");
  });

  it("shows a recoverable message when sending an OTP fails", async () => {
    signInMock.mockRejectedValueOnce(new Error("provider unavailable"));
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "operator@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));

    expect(await screen.findByText("We couldn’t send a code. Check your email address and try again.")).toBeInTheDocument();
  });

  it("shows a recoverable message when OTP verification fails", async () => {
    signInMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("invalid OTP"));
    render(<SignInForm />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "operator@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send verification code" }));
    await screen.findByRole("heading", { name: "Check your email" });
    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify and enter" }));

    expect(await screen.findByText("That code is invalid or expired. Check the latest email or request a new code.")).toBeInTheDocument();
  });
});
