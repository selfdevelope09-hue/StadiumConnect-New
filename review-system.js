// Review System - Firebase Functions

// Check if user can review
async function canReview(bookingId, userPhone) {
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    const booking = bookingDoc.data();
    
    // Conditions:
    // 1. Booking exists
    // 2. User phone matches booking phone
    // 3. Payment completed (status === 'completed')
    // 4. Not already reviewed
    
    if (!booking) return { can: false, reason: 'Booking not found' };
    if (booking.userPhone !== userPhone) return { can: false, reason: 'You can only review your own bookings' };
    if (booking.status !== 'completed') return { can: false, reason: 'Review available only after event completion' };
    
    // Check if already reviewed
    const reviewSnap = await getDocs(collection(db, 'reviews'));
    const alreadyReviewed = reviewSnap.docs.some(doc => doc.data().bookingId === bookingId);
    if (alreadyReviewed) return { can: false, reason: 'You have already reviewed this vendor' };
    
    return { can: true };
}

// Submit review
async function submitReview(vendorId, bookingId, userId, userName, userPhone, rating, comment) {
    const reviewData = {
        vendorId,
        bookingId,
        userId,
        userName,
        userPhone,
        rating,
        comment,
        createdAt: new Date().toISOString(),
        verified: true  // Verified purchase
    };
    
    await addDoc(collection(db, 'reviews'), reviewData);
    
    // Update vendor average rating
    const reviewsSnap = await getDocs(collection(db, 'reviews'));
    const vendorReviews = reviewsSnap.docs.filter(doc => doc.data().vendorId === vendorId);
    const avgRating = vendorReviews.reduce((sum, doc) => sum + doc.data().rating, 0) / vendorReviews.length;
    await updateDoc(doc(db, 'vendors', vendorId), { rating: avgRating.toFixed(1), reviewsCount: vendorReviews.length });
}
