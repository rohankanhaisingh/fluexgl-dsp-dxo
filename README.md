# DXO Mixer

Desktop app (Electron) for the Omnitronic DXO-48PRO MK2, built on the [DSP-Mixer](https://github.com/rohankanhaisingh/DSP-Mixer) UI. It talks to the processor over USB (a CDC serial port, vendor id `0684`) with the protocol that DXOControl 4.0.1 uses.

## Running

```bash
npm install
npm run electron:dev     # Vite dev server + Electron, with hot reload
npm run electron:start   # build, then run Electron on the built UI
npm run dev              # UI only, in the browser, with the simulated processor
npm run test:protocol    # encoder/decoder tests
```

Close DXOControl first: only one program can have the COM port open.

The app connects **read only**. Changes are only sent after switching on *Live control* in the left panel.

## Layout

- `electron/dxo-protocol.cjs` – packet encoding/decoding (XOR code table, checksums, fragments)
- `electron/dxo-link.cjs` – serial connection, send/receive loop, read and write queues
- `electron/main.cjs`, `electron/preload.cjs` – window and the `window.dxo` bridge
- `src/device/parameters.ts` – every parameter of the 2_10_31 unit: key, range, scale
- `src/device/deviceStore.ts` – values, link status and React hooks
- `src/device/simulator.ts` – a pretend processor for working without hardware
- `src/components/dxo/` – mixer, channel strips, EQ, crossover, dynamics and routing windows

## Tested on hardware

On the unit here (announces type `2_1_3`, firmware 3.9.1) reading and writing work over USB:

- The unit speaks the **classic** format (42 byte `DDA` answers). The MK2 length header is refused (`DDC`).
- Commands sent right after an answer are refused (`DDN`); the link waits 25 ms between commands.
- A SET is repeated together with a GET of the same key until the unit reports the new value, like DXOControl does.
- The number of inputs/outputs is taken from the VU data (2 in, 6 out on this unit).

`node scripts/probe.cjs COM6` reads a few values; `node scripts/write-test.cjs COM6` lowers output 1 by 1 dB and restores it.

## Protocol in short

Every parameter is a key `[struct, member, channel, index]`. Inputs are channels 0–3 (A–D), outputs 0x80–0x87 (1–8).
Values are big endian, scaled per member (gain ×100, Q ×10, delay ×1000).

PC → unit: `05 'D' 'D' 'J'` (MK2: `lenHi lenLo 'D' 'J'`), body fragments XOR-ed with a 32 byte code table
(`GET: 03 07 s m c i 'j'`, `SET: 04 6+n s m c i value`), then `FD hwId FF myId` and an XOR checksum starting at 0xAA.

Unit → PC: `DDB` announcements, `DDW` (MK2) or `DDA` data packets with RSP, VU and gain reduction fragments.
