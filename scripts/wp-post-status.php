<?php
$out = [];
foreach (get_posts(['post_type'=>'post','post_status'=>['publish','future','draft','pending','private'],'numberposts'=>-1]) as $p) {
  $m = fn($k) => get_post_meta($p->ID, $k, true);
  $out[] = ['id'=>$p->ID,'slug'=>$p->post_name,'title'=>$p->post_title,'status'=>$p->post_status,'date'=>$p->post_date,
    'pinned'=>$m('pinned')==='1','pinned_until'=>$m('pinned_until'),'stale'=>$m('stale')==='1',
    'post_to_bsky'=>$m('post_to_bsky')==='1','bsky_post_uri'=>$m('bsky_post_uri'),'has_image'=>has_post_thumbnail($p->ID),'has_excerpt'=>trim($p->post_excerpt)!==''];
}
echo wp_json_encode($out);
