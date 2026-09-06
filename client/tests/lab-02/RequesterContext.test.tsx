import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { RequesterProvider, useRequester } from "../../src/RequesterContext.js";
import { type ReactNode } from "react";

function wrapper({ children }: { children: ReactNode }) {
  return <RequesterProvider>{children}</RequesterProvider>;
}

const requester = { id: 1, name: "Jennifer Anderson", email: "j@test.dev", department: "Marketing" };

describe("RequesterContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with null requester when localStorage is empty", () => {
    const { result } = renderHook(() => useRequester(), { wrapper });
    expect(result.current.requester).toBeNull();
  });

  it("restores requester from localStorage", () => {
    localStorage.setItem("toktickit-requester", JSON.stringify(requester));
    const { result } = renderHook(() => useRequester(), { wrapper });
    expect(result.current.requester).toEqual(requester);
  });

  it("selectRequester stores to localStorage and updates state", () => {
    const { result } = renderHook(() => useRequester(), { wrapper });

    act(() => {
      result.current.selectRequester(requester);
    });

    expect(result.current.requester).toEqual(requester);
    expect(localStorage.getItem("toktickit-requester")).toBe(JSON.stringify(requester));
  });

  it("clearRequester removes from localStorage and resets state", () => {
    localStorage.setItem("toktickit-requester", JSON.stringify(requester));
    const { result } = renderHook(() => useRequester(), { wrapper });

    act(() => {
      result.current.clearRequester();
    });

    expect(result.current.requester).toBeNull();
    expect(localStorage.getItem("toktickit-requester")).toBeNull();
  });
});
