/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import type { BskyActor } from '../utils/bsky';
import { fetchBskyInteractors } from '../utils/bsky';

interface Props {
	uri: string;
	initial?: BskyActor[];
}

export default function BskyInteractors({ uri, initial = [] }: Props) {
	const [interactors, setInteractors] = useState<BskyActor[]>(initial);

	useEffect(() => {
		(async () => {
			const data = await fetchBskyInteractors(uri);
			setInteractors(data);
		})();
	}, [uri]);

	if (interactors.length === 0) return null;

	return (
		<div class='bsky-avatars bsky-avatars--has-interactors'>
			{interactors.map((actor) =>
				actor.avatar ? (
					<a
						href={`https://bsky.app/profile/${actor.handle}`}
						target='_blank'
						rel='noopener noreferrer'
						title={actor.displayName ?? actor.handle}
					>
						<img
							src={actor.avatar}
							alt={actor.displayName ?? actor.handle}
							width='28'
							height='28'
							class='bsky-avatar'
						/>
					</a>
				) : (
					<a
						href={`https://bsky.app/profile/${actor.handle}`}
						target='_blank'
						rel='noopener noreferrer'
						title={actor.displayName ?? actor.handle}
						aria-label={actor.displayName ?? actor.handle}
						class='bsky-avatar bsky-avatar--placeholder'
					>
						{(actor.displayName ?? actor.handle).charAt(0).toUpperCase()}
					</a>
				)
			)}
		</div>
	);
}
