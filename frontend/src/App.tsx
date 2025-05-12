import { type Component, createSignal } from "solid-js";
import styles from "./App.module.css";

const PROTOCOL_REGEX = /^https?:\/\//;

const App: Component = () => {
	const [isLoading, setIsLoading] = createSignal<boolean>(false);
	const [error, setError] = createSignal<string>("");
	const [roomId, setRoomId] = createSignal<string>("");
	const [username, setUsername] = createSignal<string>("");
	const [message, setMessage] = createSignal<string>("");
	const [messages, setMessages] = createSignal<
		Array<{ content: string; id: string }>
	>([]);
	const [socket, setSocket] = createSignal<WebSocket | null>(null);

	const createChat = async () => {
		setIsLoading(true);
		setError("");

		try {
			const res = await fetch(
				`${import.meta.env.VITE_BACKEND_HOST}/room/create`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
				},
			);

			if (!res.ok) {
				throw new Error(
					`Failed to create chat: ${res.status} ${res.statusText}`,
				);
			}

			const data = await res.json();
			setRoomId(data.roomId);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
		}
	};

	const joinChat = () => {
		if (!roomId()) {
			setError("Room ID is required");
			return;
		}

		if (!username()) {
			setError("Username is required");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			// Create the WebSocket URL with the username as a query parameter
			const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			const backendHost = import.meta.env.VITE_BACKEND_HOST.replace(
				PROTOCOL_REGEX,
				"",
			);
			const wsUrl = `${wsProtocol}//${backendHost}/room/${roomId()}/join?username=${encodeURIComponent(username())}`;

			// Create and open the WebSocket connection
			const wsSocket = new WebSocket(wsUrl);
			setSocket(wsSocket);

			wsSocket.onopen = () => {
				setIsLoading(false);
			};

			wsSocket.onmessage = (event) => {
				// Handle incoming messages
				const message = JSON.parse(event.data);
				setMessages((prev) => [
					...prev,
					{ ...message, id: crypto.randomUUID() },
				]);
			};

			wsSocket.onclose = () => {
				setSocket(null);
			};

			wsSocket.onerror = (_error) => {
				// Remove console.error
				setError("Failed to connect to chat room");
				setIsLoading(false);
				setSocket(null);
			};
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setIsLoading(false);
		}
	};

	// Add debounce function for typing
	const debounce = <T extends (...args: unknown[]) => unknown>(
		fn: T,
		delay: number,
	): ((...args: Parameters<T>) => void) => {
		let timeoutId: number | undefined;

		return (...args: Parameters<T>) => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			timeoutId = window.setTimeout(() => {
				fn(...args);
				timeoutId = undefined;
			}, delay);
		};
	};

	// Function to send message
	const sendMessage = (text: string) => {
		const currentSocket = socket();
		if (!(currentSocket && text)) {
			return;
		}

		const messageObj = {
			content: text,
		};

		currentSocket.send(JSON.stringify(messageObj));
	};

	// Debounced send message (300ms delay)
	const debouncedSendMessage = debounce(sendMessage, 300);

	const buttonStyle = {
		padding: "10px 20px",
		"font-size": "16px",
		margin: "20px 10px 20px 0",
		cursor: isLoading() ? "not-allowed" : "pointer",
	};

	const inputStyle = {
		padding: "10px",
		"font-size": "16px",
		margin: "10px 0",
		width: "100%",
		boxSizing: "border-box" as const,
	};

	const roomIdId = "room-id-input";
	const usernameId = "username-input";

	return (
		<div class={styles.App}>
			<header>
				<p>Shhh</p>
			</header>
			<main>
				<div style={{ margin: "20px 0" }}>
					<label
						for={roomIdId}
						style={{ display: "block", margin: "10px 0 5px" }}
					>
						Room ID: <span style={{ color: "red" }}>*</span>
					</label>
					<input
						id={roomIdId}
						type="text"
						value={roomId()}
						onInput={(e) => setRoomId(e.currentTarget.value)}
						placeholder="Enter Room ID or create a new chat"
						style={inputStyle}
						required={true}
					/>

					<label
						for={usernameId}
						style={{ display: "block", margin: "10px 0 5px" }}
					>
						Username: <span style={{ color: "red" }}>*</span>
					</label>
					<input
						id={usernameId}
						type="text"
						value={username()}
						onInput={(e) => setUsername(e.currentTarget.value)}
						placeholder="Enter your username"
						style={inputStyle}
						required={true}
					/>
				</div>

				<div>
					<button
						type="button"
						onClick={createChat}
						disabled={isLoading()}
						style={buttonStyle}
					>
						{isLoading() ? "Creating..." : "Create New Chat"}
					</button>

					<button
						type="button"
						onClick={joinChat}
						disabled={isLoading() || !roomId() || !username()}
						style={buttonStyle}
					>
						{isLoading() ? "Joining..." : "Join Chat"}
					</button>
				</div>

				{error() && (
					<div style={{ color: "red", margin: "10px 0" }}>{error()}</div>
				)}

				{socket() && (
					<div style={{ margin: "20px 0" }}>
						<div>
							<input
								type="text"
								value={message()}
								onInput={(e) => {
									const newMessage = e.currentTarget.value;
									setMessage(newMessage);
									debouncedSendMessage(newMessage);
								}}
								placeholder="Type a message... (sends as you type)"
								style={{
									...inputStyle,
									width: "100%",
								}}
							/>
						</div>

						<div style={{ margin: "20px 0" }}>
							<h3>Messages:</h3>
							<div
								style={{
									background: "#f5f5f5",
									padding: "10px",
									"border-radius": "4px",
									"max-height": "300px",
									"overflow-y": "auto",
								}}
							>
								{messages().map((msg) => (
									<div
										style={{
											margin: "5px 0",
											padding: "5px",
											background: "#fff",
											"border-radius": "4px",
										}}
										key={msg.id}
									>
										{msg.content}
									</div>
								))}
								{messages().length === 0 && (
									<div style={{ "font-style": "italic", color: "#777" }}>
										No messages yet
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</main>
		</div>
	);
};

export default App;
