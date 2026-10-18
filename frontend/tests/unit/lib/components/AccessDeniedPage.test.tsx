import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { AccessDeniedPage } from "@/lib/components/AccessDeniedPage";

describe("AccessDeniedPage", () => {
  it("displays default access denied message", () => {
    render(<AccessDeniedPage />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.getByText(/no tienes permiso para acceder/i)).toBeInTheDocument();
    expect(screen.getByText(/contacta al administrador/i)).toBeInTheDocument();
  });

  it("displays custom message when provided", () => {
    const customMessage = "Solo los administradores pueden acceder aquí.";

    render(<AccessDeniedPage message={customMessage} />);

    expect(screen.getByText("Acceso denegado")).toBeInTheDocument();
    expect(screen.getByText(customMessage)).toBeInTheDocument();
    expect(screen.queryByText(/contacta al administrador/i)).not.toBeInTheDocument();
  });

  it("has a link to return home", () => {
    render(<AccessDeniedPage />);

    const homeLink = screen.getByText("Volver al inicio");
    expect(homeLink).toHaveAttribute("href", "/");
  });
});
