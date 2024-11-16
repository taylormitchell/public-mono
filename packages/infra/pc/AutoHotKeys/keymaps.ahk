CapsLock::Ctrl

; Mac style Cut, Copy, Paste, Select All, Undo
$#a::Send ^a
$#x::Send ^x
$#c::Send ^c
$#v::Send ^v
$#s::Send ^s
$#z::Send ^z
$#+z::Send ^y
$#w::Send ^w
$#f::Send ^f
$#n::Send ^n
$#t::Send ^t
$#BS::Del
LWin & Tab::AltTab
$#h::#Down

; Vim bindings for arrow keys
$^j::Send {Ctrl up}{Down}{Ctrl down}
$^k::Send {Ctrl up}{Up}{Ctrl down}
$^h::Send {Ctrl up}{Left}{Ctrl down}
$^l::Send {Ctrl up}{Right}{Ctrl down}

; Expansions
:*:kmem::taylor.j.mitchell@gmail.com
:*:kmtm::Taylor Mitchell
:*:kmph::647-618-9872
:*:ipdb::import pdb; pdb.set_trace()

return
