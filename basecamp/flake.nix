{
  description = "INTERSECT production office for Logos Basecamp, with a private Intersect Archive on Logos Storage";

  inputs = {
    logos-module-builder.url = "github:logos-co/logos-module-builder";
    # Logos Storage. Basecamp 0.3+ bundles and starts it; this input lets the
    # builder generate the typed `modules().storage_module` wrapper.
    storage_module.url = "github:logos-co/logos-storage-module";
  };

  outputs = inputs@{ logos-module-builder, ... }:
    logos-module-builder.lib.mkLogosQmlModule {
      src = ./.;
      configFile = ./metadata.json;
      flakeInputs = inputs;
    };
}
