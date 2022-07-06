# Magicboard Network Protocol

- Status: Draft

The Magicboard Network Protocol is an application layer protocol for exchanging information between Magicboard processes. This specification describes the Magicboard Network Protocol 1.0.

## Preamble
Copyright (c) 2022 The Magicboard Contributors

This Specification is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License or any later version. This Specification is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with this program; if not, see http://www.gnu.org/licenses.

## Overview

Magicboard Network Protocol is an application layer protocol that can be used on a browser to exchange application-specific information between Magicboard processes. It first provides a fully mesh network for transferring data on a message by message basis, and then introduces several extensions for exchanging application-specific information.

These extensions include

- Dead Simple Proto

## Protocol Layer

The protocol layer provides a full mesh network that transmits data in messages, which can be used to transmit customised data. The network can use any data channel to transmit data, but only two data channels can be used at the same time: the primary data channel and the alternative data channel.

### Overall behaviour

For a process.
- To join a network, it must connect to the alternative data channel and synchronise the peer list.
- The process must establish the primary data channel with each newly joined peer.
- The process should close all data channels when it leaves the network.

### Messages
A message consists of one or more frames tightly stitched together; the message is the atomic unit of data transmission. A frame consists of a Header, a Chunk and a Padding of arbitrary length. There are two types of frames: long and short.

````
+ ---------------- + ------------------- + -------------------- +
| Header (1 otect) | Chunk (2^32 otects) | Padding (any otects) |
+ ---------------- + ------------------- + -------------------- +
````

#### Header
The size of the header is 1 octet. The 8th bit is FLAG_MORE, the 7th bit is FLAG_LONG and the other bits should be set to 0.

- A FLAG_MORE of 1 means that the message has one more frame, a 0 means that the frame is the end of the message.
- A FLAG_LONG of 1 means that the frame is a long frame, a 0 means that the frame is a short frame.

#### Chunk
The chunk starts with the Payload Length, which is 4 bytes for a long frame and 2 bytes for a short frame. The Payload Length is followed by the Load, which must be equal to the Payload Length.

````
+ ------------------------------ + --------------------------------- +
| Payload Length (2 or 4 otects) | Payload (2^16-1 or 2^32-1 otects) |
+ ------------------------------ + --------------------------------- +
````

The length of the load is a large end-order unsigned integer for both long and short frames. The maximum length of the load is 2^16-1 bytes in short frames and 2^32-1 bytes in long frames.

### Protocol messages
A protocol message consists of three frames.

0. message type (4-byte unsigned integer in big-end sequence)
1. message logical time (8-byte unsigned integer in big terminal sequence)
2. parameters (JSON strings)

The message logical time is generated from the logical clock of the process and is used to identify the order in which the messages are generated. Processes must receive messages generated after those already received and should discard the rest.

The logical clock of a process defaults to 0 and is incremented by 1 before sending a message.

#### SYNC_PEERS

Message type: `1`

Parameters: Array of all peer ID strings

#### SYNC_PEERS_REP

Message type: `3`

Parameters: Array of all peer ID strings

#### RTC_PROVIDE_OFFER

Information type: `2`

Parameters: Object
- `type`: string. One of `answer`, `offer`, `pranswer`, `proffer`.
- `description`: optional, string. session Description Protocol information.

#### RTC_ICE_CANDIDATE

Message type: `4`

Parameters: Object
- `candidate`: optional. String describing the candidate attribute, taken directly from the SDP attribute `candidate`. The string describes the network connection information for this candidate.
- `sdpMid`: optional. String containing the identification tag of the media stream to which the candidate is associated.
- `sdpMLineIndex`: optional. Number, the index of the SDP in the media description that candidate is associated with.
- `usernameFragment`: optional. String containing the user business card segment (often abbreviated as `ufrag` or `ice-ufrag`) which, together with the ICE password ("ice-pwd"), uniquely identifies an ongoing ICE activity.

### Data channels
A data channel is a bi-directional data channel for sending and receiving messages. A process can only use one primary data channel and one alternative data channel.

#### Supabase data channel

The Supabase data channel is based on the Supabase database and it uses a central server to complete message distribution.

The Supabase data channel requires the following information to function properly.

- Room ID
- ID of the message recipient to be listened to

##### database structure
The channel assumes that the `room_message_queue` table exists in the default schema of the Supabase database, which is defined in the following table.

| column_name | type | comment |
|:---------------:|:-----------:|:----------------------:|
| id | int8 | primary key, auto-increment |
| room | uuid | primary key, room id |
| message | json | cannot be null |
| created_at | timestamptz | can't be null, defaults to `now()` |
| dst_user_dev_id | uuid | must not be empty |
| src_user_dev_id | uuid | must not be empty |

`message` is the message itself, `dst_user_dev_id` is the ID of the message recipient, and `src_user_dev_id` is the ID of the message sender.

##### send message

Detailed steps.
1. fill each frame of the message, ensuring that each frame is four times as long.
2. place each frame in turn, encoded in z85, as a string in a JSON array which is used as the content of the database column `message`.
3. populate `dst_user_dev_id`, `src_user_dev_id`, `room` and append the row to the end of the database table.

##### Accept information
Supabase data channels should use Supabase Realtime to listen for database changes.

Each Supabase data channel should listen for the following changes to the table `room_message_queue`.

- Insert row `dst_user_dev_id` equal to the message recipient ID that needs to be listened to
- Insert row `dst_user_dev_id` equal to the broadcast ID (an all-zero UUID)

After receiving the changes, simply parse the contents of `message` in the line as a JSON array, decoding each of the strings in turn with z85 to get the message.

#### WebRTC Data Channel

The WebRTC Data Channel is based on the Data Channel feature of WebRTC and it requires a WebRTC Data Channel to work. This Data Channel requires the help of an alternative Data Channel to establish a connection, in other words, the alternative Data Channel is used as a "signalling service".

##### WebRTC connection establishment

The WebRTC data channel does not require handshaking for the Data Channel, but directly uses the following fixed configuration.

- label: `magicmesh`
- id: `64`
- protocol: `magicmesh-rtc0`


The WebRTC connection establishment process involves two aspects: the sending and answering of the RTC Offer, and the synchronisation of the ICE Candidate. These two aspects use two separate protocol messages.

- RTC_PROVIDE_OFFER
- RTC_ICE_CANDIDATE

##### Sending messages

Detailed steps.
1. insert three frames before the first frame of the message: the string of the message recipient ID, the string of the room ID, and the string of the message sender ID.
2. Send the message via the WebRTC Data Channel.

##### Receive the message

Detailed steps.
1. read out each frame of the message
2. use the first three frames as: message receiver ID, room ID, message sender ID
3. from the fourth frame onwards, the original message content

### Peer list synchronisation

The process must maintain a list of all peers on the network. The peer list must include the process itself, which should be taken into account when calculating differences.

Peer list synchronisation is carried out roughly according to the following steps.

- A process broadcasts `SYNC_PEERS` information
- For each process that receives the `SYNC_PEERS` message.
  - Add the new peer found in the `SYNC_PEERS` message to the local peer list
  - Put this process on hold for a random period of time
  - Compose a list of peers that exist locally but are not in `SYNC_PEERS` and broadcast them to the network via a new `SYNC_PEERS_REP` message
- For each process that receives a `SYNC_PEERS_REP` message
  - Add the new peers found in the `SYNC_PEERS_REP` message to the local peer list.

## Extensions

### Dead Simple Proto

This is a very simple brush action synchronisation protocol. It has only one message.

- SEND_DRAWING

#### SEND_DRAWING

Message type: `302`

This message does not follow the structure of a protocol message, a message contains 1 frame or 5 frames.
The 5 frames represent one brush action.

0. `302` literal, 4-byte unsigned integer in big terminal order
1. the X-axis of the brush coordinates, a 4-byte unsigned integer in big terminal order
2. the Y-axis of the brush, a 4-byte unsigned integer in the big terminal sequence
3. brush line width, 4-byte unsigned integer in big terminal sequence
4. brush colour, string.

1 frame representing the end of the stroke.

0. `302` literal, 4-byte unsigned integer in big terminal sequence


Translated with www.DeepL.com/Translator (free version)
