# ProyectoInnovacion

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Docker y CI/CD

Este proyecto incluye una imagen Docker multi-stage y un workflow de GitHub Actions para publicar automáticamente la imagen en GHCR al hacer push a `main`.

### Build local

```bash
docker build -t proyecto-innovacion-front .
```

### Run local

```bash
docker run --rm -p 8080:8080 proyecto-innovacion-front
```

### Imagen publicada por GitHub Actions

```text
ghcr.io/<tu-usuario-o-org>/proyecto-innovacion-front:latest
ghcr.io/<tu-usuario-o-org>/proyecto-innovacion-front:<sha>
```

## Development server

Prerequisites: install pnpm (https://pnpm.io/). Then install dependencies and start the dev server:

```bash
pnpm install
pnpm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

The production build output is served from `dist/proyectoInnovacion/browser` in the Docker image.

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
