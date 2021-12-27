import { Client } from "../../src";

export class Main {
  private static _client: Client;

  static get Client(): Client {
    return this._client;
  }

  static start(): void {
    this._client = new Client();

    this._client.login(
      /*  Your token */
      '',
      `${__dirname}/*.ts`,
      `${__dirname}/*.js`
    );
  }
}

Main.start();
