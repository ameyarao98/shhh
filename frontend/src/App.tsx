import { type Component, createSignal } from "solid-js";
import styles from "./App.module.css";

const App: Component = () => {
	const [response, setResponse] = createSignal<string>("");
	const [isLoading, setIsLoading] = createSignal<boolean>(false);
	const [error, setError] = createSignal<string>("");

	const createChat = async () => {
		setIsLoading(true);
		setError("");
		setResponse("");

		try {
			const res = await fetch("http://localhost:8000/room/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (!res.ok) {
				throw new Error(
					`Failed to create chat: ${res.status} ${res.statusText}`,
				);
			}

			const data = await res.json();
			setResponse(JSON.stringify(data, null, 2));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div class={styles.App}>
			<header>
				<p>Shhh</p>
			</header>
			<main>
				<button
					type="submit"
					onClick={createChat}
					disabled={isLoading()}
					style={{
						padding: "10px 20px",
						"font-size": "16px",
						margin: "20px 0",
						cursor: isLoading() ? "not-allowed" : "pointer",
					}}
				>
					{isLoading() ? "Creating..." : "Create New Chat"}
				</button>

				{error() && (
					<div style={{ color: "red", margin: "10px 0" }}>{error()}</div>
				)}

				{response() && (
					<div style={{ margin: "20px 0" }}>
						<h3>Response:</h3>
						<pre
							style={{
								background: "#f5f5f5",
								padding: "10px",
								"border-radius": "4px",
								"white-space": "pre-wrap",
							}}
						>
							{response()}
						</pre>
					</div>
				)}
			</main>
		</div>
	);
};

export default App;
