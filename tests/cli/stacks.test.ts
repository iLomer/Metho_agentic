import { describe, it, expect } from "vitest";
import {
  getStackDescription,
  getDefinitionOfDone,
  getStarterEpics,
} from "../../src/cli/stacks.js";

describe("getStackDescription", () => {
  it("returns Python FastAPI description with expected layers", () => {
    const result = getStackDescription("python-fastapi");

    expect(result).toContain("Python 3.11+");
    expect(result).toContain("FastAPI");
    expect(result).toContain("PostgreSQL or SQLite");
    expect(result).toContain("SQLAlchemy or Tortoise");
    expect(result).toContain("OpenAPI/Swagger");
  });

  it("returns Go description with expected layers", () => {
    const result = getStackDescription("go");

    expect(result).toContain("Go 1.22+");
    expect(result).toContain("net/http or Chi/Gin");
    expect(result).toContain("PostgreSQL via pgx or GORM");
    expect(result).toContain("Built-in testing package");
  });

  it("returns Vite + React description with expected layers", () => {
    const result = getStackDescription("vite-react");

    expect(result).toContain("Vite");
    expect(result).toContain("React 18+");
    expect(result).toContain("Tailwind CSS or CSS Modules");
    expect(result).toContain("React Router");
    expect(result).toContain("Zustand or Redux Toolkit");
  });

  it("returns Flutter description with expected layers", () => {
    const result = getStackDescription("flutter");

    expect(result).toContain("Dart");
    expect(result).toContain("Flutter widgets");
    expect(result).toContain("Riverpod or Bloc");
    expect(result).toContain("Firebase or custom API");
    expect(result).toContain("Flutter test framework");
  });
});

describe("getDefinitionOfDone", () => {
  it("returns Python FastAPI DoD with universal and stack-specific checks", () => {
    const result = getDefinitionOfDone("python-fastapi");

    expect(result).toContain("mypy type checking");
    expect(result).toContain("No `print()`");
    expect(result).toContain("No commented-out code");
    expect(result).toContain("proper HTTP status codes");
    expect(result).toContain("Pydantic models");
    expect(result).toContain("Database migrations");
    expect(result).toContain("/docs");
  });

  it("returns Go DoD with universal and stack-specific checks", () => {
    const result = getDefinitionOfDone("go");

    expect(result).toContain("`go build`");
    expect(result).toContain("`go vet`");
    expect(result).toContain("No `fmt.Println`");
    expect(result).toContain("No commented-out code");
    expect(result).toContain("`golangci-lint`");
    expect(result).toContain("Error values always checked");
    expect(result).toContain("Context propagated");
    expect(result).toContain("`go test ./...`");
  });

  it("returns Vite + React DoD with universal and stack-specific checks", () => {
    const result = getDefinitionOfDone("vite-react");

    expect(result).toContain("TypeScript compiles");
    expect(result).toContain("No `any`");
    expect(result).toContain("No `console.log`");
    expect(result).toContain("No commented-out code");
    expect(result).toContain("No layout shifts");
    expect(result).toContain("Responsive at 375px");
    expect(result).toContain("Route transitions");
    expect(result).toContain("`npm run build`");
    expect(result).toContain("browser console");
  });

  it("returns Flutter DoD with universal and stack-specific checks", () => {
    const result = getDefinitionOfDone("flutter");

    expect(result).toContain("`dart analyze`");
    expect(result).toContain("No `print()`");
    expect(result).toContain("No commented-out code");
    expect(result).toContain("iOS simulator");
    expect(result).toContain("Android emulator");
    expect(result).toContain("No hardcoded dimensions");
    expect(result).toContain("`flutter test`");
    expect(result).toContain("Responsive across screen sizes");
  });
});

describe("getStarterEpics", () => {
  it("returns Python FastAPI epics with expected structure", () => {
    const result = getStarterEpics("python-fastapi", "my-api");

    expect(result).toContain("my-api");
    expect(result).toContain("E1 -- Project Setup");
    expect(result).toContain("FastAPI");
    expect(result).toContain("virtual environment");
    expect(result).toContain("E2 -- Database + Models");
    expect(result).toContain("SQLAlchemy");
    expect(result).toContain("migrations");
    expect(result).toContain("E3 -- Core API Endpoints");
    expect(result).toContain("E4 -- Deploy");
    expect(result).toContain("Docker");
    expect(result).toContain("Not started");
    expect(result).toContain("To be sliced by @meto-pm");
  });

  it("returns Go epics with expected structure", () => {
    const result = getStarterEpics("go", "my-service");

    expect(result).toContain("my-service");
    expect(result).toContain("E1 -- Project Setup");
    expect(result).toContain("Go module");
    expect(result).toContain("Makefile");
    expect(result).toContain("E2 -- Core Service");
    expect(result).toContain("E3 -- Testing + CI");
    expect(result).toContain("golangci-lint");
    expect(result).toContain("E4 -- Deploy");
    expect(result).toContain("Docker");
    expect(result).toContain("Not started");
    expect(result).toContain("To be sliced by @meto-pm");
  });

  it("returns Vite + React epics with expected structure", () => {
    const result = getStarterEpics("vite-react", "my-spa");

    expect(result).toContain("my-spa");
    expect(result).toContain("E1 -- Project Setup");
    expect(result).toContain("Vite");
    expect(result).toContain("React");
    expect(result).toContain("Tailwind");
    expect(result).toContain("React Router");
    expect(result).toContain("E2 -- Core Feature");
    expect(result).toContain("E3 -- Testing");
    expect(result).toContain("Vitest");
    expect(result).toContain("React Testing Library");
    expect(result).toContain("E4 -- Deploy");
    expect(result).toContain("static hosting");
    expect(result).toContain("Not started");
    expect(result).toContain("To be sliced by @meto-pm");
  });

  it("returns Flutter epics with expected structure", () => {
    const result = getStarterEpics("flutter", "my-app");

    expect(result).toContain("my-app");
    expect(result).toContain("E1 -- Project Setup");
    expect(result).toContain("Flutter");
    expect(result).toContain("theme");
    expect(result).toContain("E2 -- Navigation + Routing");
    expect(result).toContain("GoRouter");
    expect(result).toContain("E3 -- Core Feature");
    expect(result).toContain("E4 -- App Store Prep");
    expect(result).toContain("icons");
    expect(result).toContain("splash");
    expect(result).toContain("Not started");
    expect(result).toContain("To be sliced by @meto-pm");
  });
});
