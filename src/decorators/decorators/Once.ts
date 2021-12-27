import {
  MetadataStorage,
  DiscordEvents,
  DOn
} from "../..";

export function Once(event: DiscordEvents) {
  return (target: Object, key: string, descriptor: PropertyDescriptor): void => {
    const on = (
      DOn
      .createOn(
        event,
        true
      )
      .decorate(
        target.constructor,
        key,
        descriptor.value
      )
    );

    MetadataStorage.instance.addOn(on);
  };
}
