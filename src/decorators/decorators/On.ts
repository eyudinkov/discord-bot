import {
  MetadataStorage,
  DiscordEvents,
  DOn
} from "../..";

export function On(event: DiscordEvents) {
  return (target: Object, key: string, descriptor?: PropertyDescriptor): void => {
    const on = (
      DOn
      .createOn(
        event,
        false
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
